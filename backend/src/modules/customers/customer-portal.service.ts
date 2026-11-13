import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../auth/auth.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Support ticket categories and priorities the customer portal can send. */
const SUPPORT_CATEGORIES = ['BOOKING', 'PAYMENT', 'INSPECTION', 'ROADSIDE', 'GENERAL', 'BILLING', 'VEHICLE_ISSUE', 'DAMAGE_DISPUTE'];
const SUPPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const CUSTOMER_DOCUMENT_TYPES: UploadDocumentDTO['documentType'][] = [
  'DRIVER_LICENSE_FRONT',
  'DRIVER_LICENSE_BACK',
  'PASSPORT',
  'NATIONAL_ID',
  'UTILITY_BILL',
];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Recognises the real file type from its first bytes, so a renamed HTML or script file is rejected. */
function detectDocumentType(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'pdf' | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length > 5 && buffer.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  return null;
}

/** Saves an identity document under a random, unguessable name inside uploads/documents only. */
function storeCustomerDocument(dataUrl: string): { url: string; size: number } {
  const match = /^data:[\w.+/-]+;base64,(.+)$/s.exec(String(dataUrl));
  if (!match) throw AppError.badRequest('The document must be sent as a base64 data URL');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0) throw AppError.badRequest('The document file is empty');
  if (buffer.length > MAX_DOCUMENT_BYTES) throw AppError.badRequest('The document must be 10 MB or smaller');
  const ext = detectDocumentType(buffer);
  if (!ext) throw AppError.badRequest('Only JPG, PNG, WEBP or PDF documents are accepted');

  const dir = path.join(process.cwd(), 'uploads', 'documents');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `doc-${crypto.randomBytes(16).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return { url: `/uploads/documents/${filename}`, size: buffer.length };
}

export interface CustomerProfileUpdateDTO {
  fullName?: string;
  phone?: string;
  driverLicenseNumber?: string;
  licenseExpiryDate?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
}

export interface UploadDocumentDTO {
  documentType: 'DRIVER_LICENSE_FRONT' | 'DRIVER_LICENSE_BACK' | 'PASSPORT' | 'NATIONAL_ID' | 'UTILITY_BILL';
  title: string;
  documentNumber?: string;
  fileBase64?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: string;
}

export interface CreateSupportTicketDTO {
  subject: string;
  category: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  bookingId?: string;
  message: string;
}

export interface ProcessPaymentDTO {
  bookingId: string;
  amount: number;
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'CASH';
  cardNumberLast4?: string;
  cardBrand?: string;
  type?: 'RENTAL_PAYMENT' | 'SECURITY_DEPOSIT' | 'DAMAGE_FEE' | 'EXTENSION_PAYMENT';
}

/** Unpaid online checkouts older than this are closed automatically. */
const ABANDONED_CHECKOUT_HOURS = 24;

export class CustomerPortalService {
  /**
   * Resolves or automatically initializes a Customer profile record for the authenticated user.
   */
  /**
   * Online checkouts that were never paid within a day are closed as EXPIRED,
   * so they stop showing as "pending" and as money owed.
   */
  static async expireAbandonedCheckouts(customerId?: string) {
    const cutoff = new Date(Date.now() - ABANDONED_CHECKOUT_HOURS * 60 * 60 * 1000);
    await prisma.booking.updateMany({
      where: {
        ...(customerId ? { customerId } : {}),
        status: 'PENDING',
        settlementStatus: 'AWAITING_PAYMENT',
        createdAt: { lt: cutoff },
        payments: { none: { status: 'SUCCEEDED' } },
      },
      data: { status: 'EXPIRED', settlementStatus: 'EXPIRED' },
    });
  }

  static async getOrCreateCustomer(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user) {
      throw AppError.notFound('User account not found');
    }

    if (user.customerProfile) {
      await this.expireAbandonedCheckouts(user.customerProfile.id);
      return user.customerProfile;
    }

    // Auto-create customer profile matching user details
    const existingByEmail = await prisma.customer.findUnique({
      where: { email: user.email },
    });

    if (existingByEmail) {
      return prisma.customer.update({
        where: { id: existingByEmail.id },
        data: { userId: user.id },
      });
    }

    return prisma.customer.create({
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null,
      },
    });
  }

  /**
   * Dynamic Customer Portal Overview Dashboard Data
   */
  static async getOverview(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 1. Active Rentals
    const activeRentals = await prisma.rental.findMany({
      where: {
        booking: { customerId: customer.id },
        status: { in: ['ACTIVE', 'PICKED_UP'] },
      },
      include: {
        vehicle: {
          include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
        },
        booking: {
          include: { pickupBranch: true, returnBranch: true },
        },
      },
      orderBy: { pickedUpAt: 'desc' },
      take: 1,
    });

    // 2. Upcoming Bookings
    const now = new Date();
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['CONFIRMED', 'PENDING', 'RESERVED'] },
        pickupDateTime: { gte: now },
      },
      include: {
        vehicle: {
          include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
        },
        pickupBranch: true,
        returnBranch: true,
      },
      orderBy: { pickupDateTime: 'asc' },
      take: 3,
    });

    // 3. Recently completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['COMPLETED', 'RETURN_INSPECTION'] },
      },
      include: {
        vehicle: { select: { brand: true, model: true, primaryImageUrl: true } },
      },
      orderBy: { returnDateTime: 'desc' },
      take: 5,
    });

    // 4. Counts & Summaries
    const totalBookingsCount = await prisma.booking.count({
      where: { customerId: customer.id },
    });

    const activeBookingsCount = await prisma.booking.count({
      where: {
        customerId: customer.id,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
      },
    });

    // 5. Outstanding balance: same rule as the Payments page (rental total + deposit - payments)
    const openBookings = await prisma.booking.findMany({
      where: { customerId: customer.id, status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED'] } },
      select: { id: true, totalAmount: true, depositAmount: true, currency: true },
    });
    const succeededPayments = await prisma.payments.findMany({
      where: { bookingId: { in: openBookings.map((b) => b.id) }, status: 'SUCCEEDED' },
      select: { bookingId: true, amount: true },
    });
    const pendingBalanceTotal = openBookings.reduce((sum, b) => {
      const paid = succeededPayments.filter((p) => p.bookingId === b.id).reduce((s2, p) => s2 + Number(p.amount), 0);
      return sum + Math.max(0, Number(b.totalAmount) + Number(b.depositAmount || 0) - paid);
    }, 0);
    const balanceCurrency = openBookings[0]?.currency || (await this.resolveCurrency(customer.id));

    // 6. Documents status
    const documents = await prisma.customerDocument.findMany({
      where: { customerId: customer.id },
    });

    const hasLicense = documents.some((d) => d.documentType.startsWith('DRIVER_LICENSE'));
    const isLicenseVerified = customer.isLicenseVerified || documents.some(
      (d) => d.documentType === 'DRIVER_LICENSE_FRONT' && d.verificationStatus === 'VERIFIED'
    );

    // 7. Unread notifications count
    const unreadNotificationsCount = await prisma.customerNotification.count({
      where: { customerId: customer.id, isRead: false },
    });

    // 8. Rewards points (1 point per 100 PKR spent on completed rentals)
    const completedTotal = completedBookings.reduce(
      (sum, b) => sum + (Number(b.totalAmount) || 0),
      0
    );
    const rewardPoints = Math.floor(completedTotal / 100);

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        avatarUrl: user?.avatarUrl,
        driverLicenseNumber: customer.driverLicenseNumber,
        isLicenseVerified,
        licenseExpiryDate: customer.licenseExpiryDate,
        preferredLanguage: user?.preferredLanguage || 'en',
      },
      stats: {
        totalBookings: totalBookingsCount,
        activeBookings: activeBookingsCount,
        pendingBalanceTotal,
        currency: balanceCurrency,
        rewardPoints,
        unreadNotificationsCount,
      },
      activeRental: activeRentals[0] || null,
      nextUpcomingBooking: upcomingBookings[0] || null,
      upcomingBookings,
      recentCompletedBookings: completedBookings,
      actionAlerts: [
        ...(!isLicenseVerified
          ? [
              {
                id: 'verify-license',
                type: 'WARNING',
                title: 'Driver License Verification Required',
                message:
                  'Upload a clear photo of your valid driving license to ensure smooth vehicle handover.',
                actionLabel: 'Upload License',
                actionUrl: '/customer/documents',
              },
            ]
          : []),
        ...(pendingBalanceTotal > 0
          ? [
              {
                id: 'pending-balance',
                type: 'INFO',
                title: 'Outstanding Trip Balance',
                message: `You have ${balanceCurrency} ${pendingBalanceTotal.toLocaleString()} pending settlement across active reservations.`,
                actionLabel: 'View Invoices',
                actionUrl: '/customer/payments',
              },
            ]
          : []),
      ],
    };
  }

  /**
   * Filtered & paginated bookings belonging exclusively to the authenticated customer
   */
  static async listBookings(
    userId: string,
    query: { status?: string; search?: string; page?: number; limit?: number }
  ) {
    const customer = await this.getOrCreateCustomer(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      customerId: customer.id,
    };

    if (query.status && query.status !== 'ALL') {
      const s = query.status.toUpperCase();
      if (s === 'UPCOMING') {
        where.status = { in: ['CONFIRMED', 'PENDING', 'RESERVED'] };
        where.pickupDateTime = { gte: new Date() };
      } else if (s === 'PENDING') {
        where.status = { in: ['PENDING', 'REQUIRES_REVIEW'] };
      } else if (s === 'CONFIRMED') {
        where.status = { in: ['CONFIRMED', 'RESERVED', 'READY_FOR_PICKUP'] };
      } else if (s === 'ACTIVE') {
        where.status = 'ACTIVE';
      } else if (s === 'COMPLETED') {
        where.status = { in: ['COMPLETED', 'RETURN_INSPECTION'] };
      } else if (s === 'CANCELLED') {
        where.status = { in: ['CANCELLED', 'REJECTED', 'EXPIRED'] };
      } else {
        // Unknown filter values match nothing instead of reaching Prisma as an invalid enum
        where.status = { in: [] };
      }
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { bookingNumber: { contains: q } },
        { vehicle: { brand: { contains: q } } },
        { vehicle: { model: { contains: q } } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: {
            include: {
              category: true,
              photos: { where: { isPrimary: true }, take: 1 },
            },
          },
          pickupBranch: true,
          returnBranch: true,
          rental: true,
        },
      }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        pricingMethod: b.pricingMethod,
        dailyRate: Number(b.dailyRate),
        totalDays: b.totalDays,
        subtotal: Number(b.subtotal),
        taxAmount: Number(b.taxAmount),
        depositAmount: Number(b.depositAmount),
        totalAmount: Number(b.totalAmount),
        currency: b.currency,
        pickupDateTime: b.pickupDateTime,
        returnDateTime: b.returnDateTime,
        pickupBranch: b.pickupBranch,
        returnBranch: b.returnBranch,
        vehicle: {
          id: b.vehicle.id,
          brand: b.vehicle.brand,
          model: b.vehicle.model,
          year: b.vehicle.year,
          transmission: b.vehicle.transmission,
          fuelType: b.vehicle.fuelType,
          seats: b.vehicle.seats,
          categoryName: b.vehicle.category.name,
          primaryImageUrl: b.vehicle.photos[0]?.url || b.vehicle.primaryImageUrl,
        },
        hasRentalStarted: Boolean(b.rental),
        createdAt: b.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single booking details strictly verified against customer ownership
   */
  static async getBookingById(userId: string, bookingId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: {
          include: { category: true, photos: true },
        },
        pickupBranch: true,
        returnBranch: true,
        breakdownItems: true,
        pricingSnapshot: true,
        rental: {
          include: {
            inspections: {
              include: { photos: true, findings: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this booking');
    }

    // Load payments for this booking
    const payments = await prisma.payments.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'desc' },
      include: { refunds: true },
    });

    // Load inspections for this vehicle or rental
    const inspections = await prisma.inspection.findMany({
      where: {
        OR: [
          { rental: { bookingId: booking.id } },
          { vehicleId: booking.vehicleId },
        ],
      },
      include: { photos: true, findings: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    return {
      booking: {
        ...booking,
        dailyRate: Number(booking.dailyRate),
        subtotal: Number(booking.subtotal),
        taxAmount: Number(booking.taxAmount),
        depositAmount: Number(booking.depositAmount),
        totalAmount: Number(booking.totalAmount),
        breakdownItems: booking.breakdownItems.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
          taxAmount: Number(item.taxAmount),
        })),
        payments: payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          receiptUrl: p.receiptUrl,
          createdAt: p.createdAt,
        })),
        inspections: inspections.map((ins) => ({
          id: ins.id,
          type: ins.type,
          overallScore: ins.overallScore,
          summary: ins.summary,
          hasDamageDetected: ins.hasDamageDetected,
          createdAt: ins.createdAt,
          photos: ins.photos,
          findings: ins.findings.map((f) => ({
            ...f,
            estimatedRepairCost: f.estimatedRepairCost ? Number(f.estimatedRepairCost) : 0,
          })),
        })),
      },
    };
  }

  /**
   * Request booking cancellation with status guard and audit log
   */
  static async requestCancellation(userId: string, bookingId: string, reason?: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this booking');
    }

    if (['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw AppError.badRequest(
        `Cannot cancel booking in ${booking.status} status. Please contact support.`
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        notes: booking.notes
          ? `${booking.notes}\n[Customer Cancellation]: ${reason || 'Customer cancelled via portal'}`
          : `[Customer Cancellation]: ${reason || 'Customer cancelled via portal'}`,
      },
    });

    // Notify customer
    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        category: 'BOOKING',
        title: 'Booking Cancelled',
        message: `Your reservation #${booking.bookingNumber} has been successfully cancelled.`,
        actionUrl: `/customer/bookings/${booking.id}`,
      },
    });

    return updated;
  }

  /**
   * Rental Extension check & request
   */
  static async requestExtension(userId: string, bookingId: string, newReturnDateTime: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this booking');
    }

    const newReturnDate = new Date(newReturnDateTime);
    if (newReturnDate <= booking.returnDateTime) {
      throw AppError.badRequest('New return date must be strictly after the current scheduled return date.');
    }

    // Check vehicle availability for extended interval
    const availability = await BookingService.checkAvailability(
      booking.vehicleId,
      booking.returnDateTime,
      newReturnDate,
      booking.id
    );

    if (!availability.available) {
      throw AppError.conflict(
        availability.conflictReason || 'Vehicle has another confirmed booking for the requested extended period.'
      );
    }

    // Calculate additional quote
    const quote = await BookingService.calculateQuote(
      booking.vehicleId,
      booking.returnDateTime,
      newReturnDate
    );

    const additionalCost = quote.totalAmount;
    const addedDays = quote.totalDays || 1;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        returnDateTime: newReturnDate,
        totalAmount: Number(booking.totalAmount) + additionalCost,
        totalDays: booking.totalDays + addedDays,
        notes: `${booking.notes || ''}\n[Rental Extended]: Added ${addedDays} day(s) for PKR ${additionalCost.toLocaleString()}`,
      },
    });

    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        category: 'BOOKING',
        title: 'Rental Extension Approved',
        message: `Your booking #${booking.bookingNumber} return date was extended to ${newReturnDate.toLocaleDateString()}. Additional charge: PKR ${additionalCost.toLocaleString()}.`,
        actionUrl: `/customer/bookings/${booking.id}`,
      },
    });

    return { success: true, booking: updated, additionalCost };
  }

  /**
   * Financial summary of all transactions, deposits, and invoice records
   */
  static async getPaymentsSummary(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        vehicle: { select: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bookingIds = bookings.map((b) => b.id);

    const paymentsList = await prisma.payments.findMany({
      where: { bookingId: { in: bookingIds } },
      orderBy: { createdAt: 'desc' },
      include: { refunds: true, bookings: { select: { bookingNumber: true } } },
    });

    const totalPaid = paymentsList
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Amount due per booking = rental total + refundable deposit (the same amount Stripe checkout charges)
    const amountDue = (b: (typeof bookings)[number]) => Number(b.totalAmount) + Number(b.depositAmount || 0);
    const paidFor = (bookingId: string) =>
      paymentsList
        .filter((p) => p.bookingId === bookingId && p.status === 'SUCCEEDED')
        .reduce((s, p) => s + Number(p.amount), 0);

    const totalOutstanding = bookings
      .filter((b) => !['CANCELLED', 'REJECTED', 'EXPIRED'].includes(b.status))
      .reduce((sum, b) => sum + Math.max(0, amountDue(b) - paidFor(b.id)), 0);

    const securityDepositsHeld = bookings
      .filter((b) => ['ACTIVE', 'CONFIRMED'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.depositAmount || 0), 0);

    return {
      summary: {
        totalPaid,
        totalOutstanding,
        securityDepositsHeld,
        currency: bookings[0]?.currency || (await this.resolveCurrency(customer.id)),
      },
      transactions: paymentsList.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        bookingNumber: p.bookings?.bookingNumber || 'N/A',
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        receiptUrl: p.receiptUrl,
        createdAt: p.createdAt,
      })),
      invoices: bookings.map((b) => {
        const paidAmount = paidFor(b.id);
        const due = amountDue(b);
        return {
          id: `INV-${b.bookingNumber}`,
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
          date: b.createdAt,
          subtotal: Number(b.subtotal),
          taxAmount: Number(b.taxAmount),
          totalAmount: Number(b.totalAmount),
          depositAmount: Number(b.depositAmount || 0),
          currency: b.currency,
          bookingStatus: b.status,
          paidAmount,
          balanceDue: ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(b.status) ? 0 : Math.max(0, due - paidAmount),
          status: paidAmount >= due ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        };
      }),
    };
  }

  /**
   * Process a payment for a booking
   */
  static async processPayment(userId: string, payload: ProcessPaymentDTO) {
    await AuthService.assertEmailVerified(userId);
    const customer = await this.getOrCreateCustomer(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this booking');
    }

    // Card payments are only accepted through the verified Stripe flow (/payments/stripe/*)
    const method = String(payload.paymentMethod || '').toUpperCase();
    if (['CREDIT_CARD', 'DEBIT_CARD', 'STRIPE', 'CARD'].includes(method)) {
      throw AppError.badRequest('Card payments must be completed through secure Stripe checkout');
    }
    if (!['BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'CASH'].includes(method)) {
      throw AppError.badRequest('Unsupported payment method');
    }

    const amount = Math.round(Number(payload.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw AppError.badRequest('Payment amount must be a positive number');
    }

    // Offline methods are recorded as PENDING until staff verify the transfer; they never settle a booking directly
    const paymentId = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdPayment = await prisma.payments.create({
      data: {
        id: paymentId,
        bookingId: booking.id,
        amount,
        currency: booking.currency || env.CURRENCY,
        status: 'PENDING',
        provider: method.toLowerCase(),
        metadata: JSON.stringify({ type: payload.type || 'RENTAL_PAYMENT' }),
        updatedAt: new Date(),
      },
    });

    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        category: 'PAYMENT',
        title: 'Payment Submitted',
        message: `Your ${method.replace('_', ' ').toLowerCase()} payment of ${booking.currency || env.CURRENCY} ${amount.toLocaleString()} for booking #${booking.bookingNumber} is awaiting verification.`,
        actionUrl: '/customer/payments',
      },
    });

    return {
      success: true,
      payment: {
        id: createdPayment.id,
        amount: Number(createdPayment.amount),
        currency: createdPayment.currency,
        status: createdPayment.status,
        receiptUrl: createdPayment.receiptUrl,
        createdAt: createdPayment.createdAt,
      },
    };
  }

  /**
   * Lists customer uploaded documents
   */
  static async listDocuments(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const documents = await prisma.customerDocument.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });

    // Checklist status
    // Each checklist item lists the document types that satisfy it (an ID card or a passport both prove identity)
    const requiredTypes = [
      { type: 'DRIVER_LICENSE_FRONT', label: "Driver's License (Front View)", accepts: ['DRIVER_LICENSE_FRONT'] },
      { type: 'DRIVER_LICENSE_BACK', label: "Driver's License (Back View)", accepts: ['DRIVER_LICENSE_BACK'] },
      { type: 'NATIONAL_ID', label: 'National Identity Card or Passport', accepts: ['NATIONAL_ID', 'PASSPORT'] },
      { type: 'UTILITY_BILL', label: 'Proof of Address (Utility Bill / Bank Statement)', accepts: ['UTILITY_BILL'] },
    ];

    const checklist = requiredTypes.map((req) => {
      const doc = documents.find((d) => req.accepts.includes(d.documentType));
      return {
        type: req.type,
        label: req.label,
        isUploaded: Boolean(doc),
        status: doc?.verificationStatus || 'MISSING',
        document: doc || null,
      };
    });

    return { documents, checklist };
  }

  /**
   * Upload and persist driver identity document
   */
  static async uploadDocument(userId: string, payload: UploadDocumentDTO) {
    const customer = await this.getOrCreateCustomer(userId);

    if (!CUSTOMER_DOCUMENT_TYPES.includes(payload.documentType)) {
      throw AppError.badRequest('Unsupported document type');
    }
    if (!payload.title || String(payload.title).trim().length === 0 || String(payload.title).length > 150) {
      throw AppError.badRequest('Document title is required (up to 150 characters)');
    }
    if (payload.documentNumber && String(payload.documentNumber).length > 64) {
      throw AppError.badRequest('Document number is too long');
    }
    if (payload.expiresAt && Number.isNaN(new Date(payload.expiresAt).getTime())) {
      throw AppError.badRequest('Invalid expiry date');
    }

    // Files are only ever stored by the server; a client-supplied URL is never trusted
    let fileUrl = '';
    let storedSize: number | undefined;
    if (payload.fileBase64) {
      const stored = storeCustomerDocument(payload.fileBase64);
      fileUrl = stored.url;
      storedSize = stored.size;
    }

    // Upsert document record
    const existing = await prisma.customerDocument.findFirst({
      where: { customerId: customer.id, documentType: payload.documentType },
    });

    let doc;
    if (existing) {
      doc = await prisma.customerDocument.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          documentNumber: payload.documentNumber || existing.documentNumber,
          fileUrl: fileUrl || existing.fileUrl,
          fileName: payload.fileName ? String(payload.fileName).slice(0, 255) : existing.fileName,
          fileSize: storedSize ?? existing.fileSize,
          verificationStatus: 'PENDING_VERIFICATION',
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : existing.expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      if (!fileUrl) {
        throw AppError.badRequest('Please attach the document file');
      }
      doc = await prisma.customerDocument.create({
        data: {
          customerId: customer.id,
          documentType: payload.documentType,
          title: payload.title,
          documentNumber: payload.documentNumber,
          fileUrl,
          fileName: payload.fileName ? String(payload.fileName).slice(0, 255) : null,
          fileSize: storedSize ?? null,
          verificationStatus: 'PENDING_VERIFICATION',
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        },
      });
    }

    // If license front, sync to Customer profile
    if (payload.documentType === 'DRIVER_LICENSE_FRONT') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          driverLicenseNumber: payload.documentNumber || customer.driverLicenseNumber,
          licenseExpiryDate: payload.expiresAt ? new Date(payload.expiresAt) : customer.licenseExpiryDate,
        },
      });
    }

    // Notify customer
    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        category: 'DOCUMENT',
        title: 'Document Uploaded',
        message: `Your ${payload.title} has been received and is queued for verification.`,
        actionUrl: '/customer/documents',
      },
    });

    return { success: true, document: doc };
  }

  /**
   * Updates customer profile fields
   */
  static async updateProfile(userId: string, payload: CustomerProfileUpdateDTO) {
    const customer = await this.getOrCreateCustomer(userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: payload.fullName || undefined,
        phone: payload.phone || undefined,
        preferredLanguage: payload.preferredLanguage || undefined,
        avatarUrl: payload.avatarUrl || undefined,
      },
    });

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        fullName: payload.fullName || undefined,
        phone: payload.phone || undefined,
        driverLicenseNumber: payload.driverLicenseNumber || undefined,
        licenseExpiryDate: payload.licenseExpiryDate ? new Date(payload.licenseExpiryDate) : undefined,
      },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        preferredLanguage: updatedUser.preferredLanguage,
        avatarUrl: updatedUser.avatarUrl,
      },
      customer: updatedCustomer,
    };
  }

  /**
   * Notifications Center
   */
  static async listNotifications(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const notifications = await prisma.customerNotification.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return { notifications, unreadCount };
  }

  static async markNotificationRead(userId: string, notificationId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    return prisma.customerNotification.updateMany({
      where: { id: notificationId, customerId: customer.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markAllNotificationsRead(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    return prisma.customerNotification.updateMany({
      where: { customerId: customer.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Customer Support Tickets
   */
  static async listSupportTickets(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    return prisma.supportTicket.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  static async createSupportTicket(userId: string, payload: CreateSupportTicketDTO) {
    const customer = await this.getOrCreateCustomer(userId);
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: customer.id,
        bookingId: payload.bookingId || null,
        subject: payload.subject,
        // Unknown values from the client fall back to safe defaults instead of being stored as-is
        category: SUPPORT_CATEGORIES.includes(String(payload.category)) ? String(payload.category) : 'GENERAL',
        priority: SUPPORT_PRIORITIES.includes(String(payload.priority)) ? String(payload.priority) : 'NORMAL',
        status: 'OPEN',
        messages: {
          create: {
            senderType: 'CUSTOMER',
            senderName: customer.fullName,
            message: payload.message,
          },
        },
      },
      include: { messages: true },
    });

    return ticket;
  }

  static async replyToSupportTicket(userId: string, ticketId: string, message: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    if (ticket.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this ticket');
    }

    const createdMsg = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CUSTOMER',
        senderName: customer.fullName,
        message,
      },
    });

    // Update ticket status
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', updatedAt: new Date() },
    });

    return createdMsg;
  }

  /**
   * Rental assistant: answers from the live fleet, the customer's bookings and the real rental rules.
   * The reply comes back as a code with values (replyKey, replyParams) so the website can show it
   * in the customer's language; `reply` keeps an English copy for other clients.
   * `topic` is sent by the suggestion buttons so they work whatever language the customer types in.
   */
  static async handleAiAssistant(userId: string, prompt: string, topic?: string) {
    const customer = await this.getOrCreateCustomer(userId);
    const cleanPrompt = prompt.toLowerCase().trim();
    const has = (...words: string[]) => words.some((word) => cleanPrompt.includes(word));

    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'AVAILABLE', isListed: true },
      include: { category: true },
      take: 24,
      orderBy: { dailyRate: 'asc' },
    });

    const latestBooking = await prisma.booking.findFirst({
      where: { customerId: customer.id },
      include: { vehicle: { select: { brand: true, model: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const toSuggestion = (v: (typeof vehicles)[number]) => ({
      id: v.id,
      name: `${v.brand} ${v.model}`,
      category: v.category.name,
      price: Number(v.dailyRate),
      image: v.primaryImageUrl,
    });

    type Intent = 'suv' | 'budget' | 'documents' | 'fuel' | 'deposit' | 'inspection' | 'electric' | 'booking' | 'greeting';
    const knownTopics: Intent[] = ['suv', 'budget', 'documents', 'fuel', 'deposit', 'inspection', 'electric', 'booking'];
    let intent: Intent = 'greeting';
    if (topic && knownTopics.includes(topic as Intent)) intent = topic as Intent;
    else if (has('suv', 'spacious', 'family')) intent = 'suv';
    else if (has('electric', ' ev', 'ev ', 'hybrid')) intent = 'electric';
    else if (has('deposit', 'refund')) intent = 'deposit';
    else if (has('inspection', 'damage', 'scratch', 'dent')) intent = 'inspection';
    else if (has('price', 'cheap', 'budget', 'cost')) intent = 'budget';
    else if (has('document', 'license', 'licence', 'requirement')) intent = 'documents';
    else if (has('fuel', 'mileage', 'kilomet', ' km')) intent = 'fuel';
    else if (has('my booking', 'reservation', 'trip', 'status')) intent = 'booking';

    let replyKey: string = intent;
    let replyParams: Record<string, string | number> = {};
    let suggestedVehicles: ReturnType<typeof toSuggestion>[] = [];

    switch (intent) {
      case 'suv': {
        const suvs = vehicles.filter((v) => v.category.name.toLowerCase().includes('suv') || v.seats >= 7);
        replyKey = suvs.length > 0 ? 'suv' : 'suvNone';
        replyParams = { count: suvs.length };
        suggestedVehicles = suvs.slice(0, 4).map(toSuggestion);
        break;
      }
      case 'electric': {
        const electric = vehicles.filter((v) => v.fuelType === 'ELECTRIC' || v.fuelType === 'HYBRID');
        replyKey = electric.length > 0 ? 'electric' : 'electricNone';
        replyParams = { count: electric.length };
        suggestedVehicles = electric.slice(0, 4).map(toSuggestion);
        break;
      }
      case 'budget': {
        const cheapest = vehicles.slice(0, 3);
        replyKey = cheapest.length > 0 ? 'budget' : 'noCars';
        replyParams = { price: `${env.CURRENCY} ${Number(cheapest[0]?.dailyRate || 0).toLocaleString('en-US')}` };
        suggestedVehicles = cheapest.map(toSuggestion);
        break;
      }
      case 'booking': {
        if (latestBooking) {
          replyKey = 'bookingStatus';
          replyParams = {
            number: latestBooking.bookingNumber,
            vehicle: `${latestBooking.vehicle.brand} ${latestBooking.vehicle.model}`,
            status: latestBooking.status,
            pickup: latestBooking.pickupDateTime.toISOString(),
          };
        } else {
          replyKey = 'bookingNone';
        }
        break;
      }
      case 'greeting':
        replyParams = { name: customer.fullName || '' };
        suggestedVehicles = vehicles.slice(0, 2).map(toSuggestion);
        break;
      default:
        break;
    }

    const englishReplies: Record<string, string> = {
      suv: `We have ${replyParams.count} SUV and large cars available right now.`,
      suvNone: 'No SUV is available right now. Please check the full list of cars.',
      electric: `We have ${replyParams.count} electric or hybrid cars available right now.`,
      electricNone: 'No electric or hybrid car is available right now.',
      budget: `Our most affordable car starts from ${replyParams.price} per day.`,
      noCars: 'No car is available right now. Please try again later.',
      documents: 'To rent a car you need a valid driving licence and an ID card or passport. You can upload them in Driver Documents.',
      fuel: 'Please return the car with the same fuel level as at pickup. The included distance per day and the extra distance price are shown on each car.',
      deposit: 'A refundable security deposit is taken with each booking. It is returned after the car is returned and inspected, minus any new-damage, fuel or late-return charges.',
      inspection: 'At pickup and at return the car is photographed and checked by our AI. You only pay for new damage that was not in the pickup report.',
      bookingStatus: `Your latest booking #${replyParams.number} for the ${replyParams.vehicle} is ${replyParams.status}.`,
      bookingNone: 'You do not have any bookings yet.',
      greeting: `Hello ${replyParams.name}! I can help you find a car, explain the deposit, fuel and inspection rules, or check your booking.`,
    };

    return { reply: englishReplies[replyKey] || englishReplies.greeting, replyKey, replyParams, suggestedVehicles };
  }

  /**
   * Currency used for a customer's totals: their latest booking, otherwise the fleet's currency.
   */
  private static async resolveCurrency(customerId: string): Promise<string> {
    const latestBooking = await prisma.booking.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: { currency: true },
    });
    if (latestBooking?.currency) return latestBooking.currency;
    const anyVehicle = await prisma.vehicle.findFirst({ select: { currency: true } });
    return anyVehicle?.currency || env.CURRENCY;
  }

  /**
   * Rewards and loyalty tier, computed from completed rentals
   */
  static async getRewardsSummary(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const completedBookings = await prisma.booking.findMany({
      where: { customerId: customer.id, status: 'COMPLETED' },
    });

    const totalSpent = completedBookings.reduce(
      (sum, b) => sum + (Number(b.totalAmount) || 0),
      0
    );

    const pointsBalance = Math.floor(totalSpent / 100);

    // Determine tier
    let tier = 'Silver';
    let nextTier: string | null = 'Gold';
    let progressPercent = 0;
    if (pointsBalance >= 2000) {
      tier = 'Platinum';
      nextTier = null;
      progressPercent = 100;
    } else if (pointsBalance >= 500) {
      tier = 'Gold';
      nextTier = 'Platinum';
      progressPercent = Math.min(100, Math.round((pointsBalance / 2000) * 100));
    } else {
      progressPercent = Math.min(100, Math.round((pointsBalance / 500) * 100));
    }

    return {
      tier,
      nextTier,
      progressPercent,
      pointsBalance,
      totalSpent,
      currency: completedBookings[0]?.currency || (await this.resolveCurrency(customer.id)),
      completedRentals: completedBookings.length,
      // Points are earned at 1 point per 100 currency units on completed rentals
      pointsPerHundred: 1,
      pointsToNextTier: tier === 'Platinum' ? 0 : (tier === 'Gold' ? 2000 : 500) - pointsBalance,
    };
  }

  /**
   * Completed Rental History & Reviews
   */
  static async getRentalHistory(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    const completedRentals = await prisma.booking.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['COMPLETED', 'RETURN_INSPECTION'] },
      },
      include: {
        vehicle: {
          include: { category: true, photos: { where: { isPrimary: true }, take: 1 } },
        },
        rental: true,
      },
      orderBy: { returnDateTime: 'desc' },
    });

    const reviews = await prisma.vehicleReview.findMany({
      where: { customerId: customer.id },
    });

    return {
      history: completedRentals.map((b) => {
        const review = reviews.find((r) => r.bookingId === b.id);
        return {
          id: b.id,
          bookingNumber: b.bookingNumber,
          pickupDate: b.pickupDateTime,
          returnDate: b.returnDateTime,
          vehicle: {
            id: b.vehicle.id,
            name: `${b.vehicle.brand} ${b.vehicle.model}`,
            year: b.vehicle.year,
            category: b.vehicle.category.name,
            image: b.vehicle.photos[0]?.url || b.vehicle.primaryImageUrl,
          },
          totalAmount: Number(b.totalAmount),
          currency: b.currency,
          odometerStart: b.rental?.startMileage || 0,
          odometerEnd: b.rental?.endMileage || 0,
          invoiceUrl: `/customer/payments?booking=${b.bookingNumber}`,
          review: review
            ? {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Submit review for completed booking
   */
  static async submitReview(
    userId: string,
    payload: { bookingId: string; vehicleId: string; rating: number; comment?: string }
  ) {
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw AppError.badRequest('Rating must be a whole number from 1 to 5');
    }
    if (typeof payload.bookingId !== 'string' || payload.bookingId.length === 0) {
      throw AppError.badRequest('bookingId is required');
    }
    const comment = payload.comment ? String(payload.comment).trim().slice(0, 1000) : null;

    const customer = await this.getOrCreateCustomer(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('Unauthorized access to this booking');
    }

    if (booking.status !== 'COMPLETED') {
      throw AppError.badRequest('Reviews can only be submitted for completed rentals.');
    }

    const review = await prisma.vehicleReview.upsert({
      where: { bookingId: payload.bookingId },
      update: {
        rating,
        comment,
      },
      create: {
        bookingId: payload.bookingId,
        // Always the car that was actually rented, never one chosen by the client
        vehicleId: booking.vehicleId,
        customerId: customer.id,
        rating,
        comment,
        isApproved: true,
      },
    });

    return review;
  }
}
