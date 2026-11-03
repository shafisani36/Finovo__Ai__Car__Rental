import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { BookingService } from '../bookings/booking.service';
import fs from 'fs';
import path from 'path';

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
  category: 'BOOKING' | 'BILLING' | 'VEHICLE_ISSUE' | 'DAMAGE_DISPUTE' | 'GENERAL';
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

export class CustomerPortalService {
  /**
   * Resolves or automatically initializes a Customer profile record for the authenticated user.
   */
  static async getOrCreateCustomer(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user) {
      throw AppError.notFound('User account not found');
    }

    if (user.customerProfile) {
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

    // 5. Pending payments
    const pendingPaymentBookings = await prisma.booking.findMany({
      where: {
        customerId: customer.id,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        settlementStatus: 'PENDING',
      },
      select: {
        id: true,
        bookingNumber: true,
        totalAmount: true,
        depositAmount: true,
        currency: true,
      },
    });

    const pendingBalanceTotal = pendingPaymentBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0
    );

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
                message: `You have PKR ${pendingBalanceTotal.toLocaleString()} pending settlement across active reservations.`,
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
      } else if (s === 'ACTIVE') {
        where.status = { in: ['ACTIVE', 'CONFIRMED'] };
      } else if (s === 'COMPLETED') {
        where.status = { in: ['COMPLETED', 'RETURN_INSPECTION'] };
      } else if (s === 'CANCELLED') {
        where.status = { in: ['CANCELLED', 'REJECTED'] };
      } else {
        where.status = s;
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

    const totalOutstanding = bookings
      .filter((b) => b.status !== 'CANCELLED' && b.status !== 'REJECTED')
      .reduce((sum, b) => {
        const paidForBooking = paymentsList
          .filter((p) => p.bookingId === b.id && p.status === 'SUCCEEDED')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + Math.max(0, Number(b.totalAmount) - paidForBooking);
      }, 0);

    const securityDepositsHeld = bookings
      .filter((b) => ['ACTIVE', 'CONFIRMED'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.depositAmount || 0), 0);

    return {
      summary: {
        totalPaid,
        totalOutstanding,
        securityDepositsHeld,
        currency: 'PKR',
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
        const paidAmount = paymentsList
          .filter((p) => p.bookingId === b.id && p.status === 'SUCCEEDED')
          .reduce((s, p) => s + Number(p.amount), 0);
        return {
          id: `INV-${b.bookingNumber}`,
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
          date: b.createdAt,
          subtotal: Number(b.subtotal),
          taxAmount: Number(b.taxAmount),
          totalAmount: Number(b.totalAmount),
          paidAmount,
          balanceDue: Math.max(0, Number(b.totalAmount) - paidAmount),
          status: paidAmount >= Number(b.totalAmount) ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        };
      }),
    };
  }

  /**
   * Process a payment for a booking
   */
  static async processPayment(userId: string, payload: ProcessPaymentDTO) {
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

    // Generate unique payment ID and transaction record
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const createdPayment = await prisma.payments.create({
      data: {
        id: paymentId,
        bookingId: booking.id,
        amount: payload.amount,
        currency: booking.currency || 'PKR',
        status: 'SUCCEEDED',
        provider: payload.paymentMethod.toLowerCase(),
        receiptUrl: `/customer/payments/${paymentId}/receipt`,
        metadata: JSON.stringify({
          cardBrand: payload.cardBrand || 'Visa',
          cardNumberLast4: payload.cardNumberLast4 || '4242',
          type: payload.type || 'RENTAL_PAYMENT',
        }),
        updatedAt: new Date(),
      },
    });

    // Update settlement status on booking if fully paid
    const allPayments = await prisma.payments.findMany({
      where: { bookingId: booking.id, status: 'SUCCEEDED' },
    });
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);

    if (totalPaid >= Number(booking.totalAmount)) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { settlementStatus: 'SETTLED' },
      });
    }

    // Notify customer
    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        category: 'PAYMENT',
        title: 'Payment Successful',
        message: `Your payment of PKR ${payload.amount.toLocaleString()} for booking #${booking.bookingNumber} was processed successfully.`,
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
    const requiredTypes = [
      { type: 'DRIVER_LICENSE_FRONT', label: "Driver's License (Front View)" },
      { type: 'DRIVER_LICENSE_BACK', label: "Driver's License (Back View)" },
      { type: 'NATIONAL_ID', label: 'National Identity Card or Passport' },
      { type: 'UTILITY_BILL', label: 'Proof of Address (Utility Bill / Bank Statement)' },
    ];

    const checklist = requiredTypes.map((req) => {
      const doc = documents.find((d) => d.documentType === req.type);
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

    let fileUrl = payload.fileUrl || '';

    // If Base64 image provided, decode and save to /uploads/documents/
    if (payload.fileBase64 && payload.fileBase64.includes(';base64,')) {
      const parts = payload.fileBase64.split(';base64,');
      const ext = parts[0].includes('png') ? 'png' : parts[0].includes('pdf') ? 'pdf' : 'jpg';
      const buffer = Buffer.from(parts[1], 'base64');
      const dir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filename = `doc-${customer.id}-${payload.documentType}-${Date.now()}.${ext}`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, buffer);
      fileUrl = `/uploads/documents/${filename}`;
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
          fileName: payload.fileName || existing.fileName,
          fileSize: payload.fileSize || existing.fileSize,
          verificationStatus: 'PENDING_VERIFICATION',
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : existing.expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      doc = await prisma.customerDocument.create({
        data: {
          customerId: customer.id,
          documentType: payload.documentType,
          title: payload.title,
          documentNumber: payload.documentNumber,
          fileUrl,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
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
        category: payload.category || 'GENERAL',
        priority: payload.priority || 'NORMAL',
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
   * AI Rental Assistant Handler
   * Responds intelligently based on real fleet data, policies, and customer bookings.
   */
  static async handleAiAssistant(userId: string, prompt: string) {
    const customer = await this.getOrCreateCustomer(userId);
    const cleanPrompt = prompt.toLowerCase().trim();

    // Contextual query to live fleet
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'AVAILABLE', isListed: true },
      include: { category: true },
      take: 6,
      orderBy: { dailyRate: 'asc' },
    });

    // Customer bookings context
    const customerBookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: { vehicle: { select: { brand: true, model: true } } },
      take: 2,
      orderBy: { createdAt: 'desc' },
    });

    let reply = '';
    let suggestedVehicles: Array<{ id: string; name: string; category: string; price: number; image?: string | null }> = [];

    if (cleanPrompt.includes('suv') || cleanPrompt.includes('spacious') || cleanPrompt.includes('family')) {
      const suvs = vehicles.filter((v) => v.category.name.toLowerCase().includes('suv') || v.seats >= 5);
      reply = `We have ${suvs.length} excellent SUV options ready for your trip. SUVs in our fleet offer high ride height, premium comfort, and generous cargo capacity for luggage or family outings.`;
      suggestedVehicles = suvs.map((v) => ({
        id: v.id,
        name: `${v.brand} ${v.model}`,
        category: v.category.name,
        price: Number(v.dailyRate),
        image: v.primaryImageUrl,
      }));
    } else if (cleanPrompt.includes('price') || cleanPrompt.includes('cheap') || cleanPrompt.includes('budget') || cleanPrompt.includes('cost')) {
      const budget = vehicles.slice(0, 3);
      reply = `Our most cost-effective vehicle options start from PKR ${Number(budget[0]?.dailyRate || 1000).toLocaleString()}/day, including comprehensive maintenance and 250 km included allowance per day.`;
      suggestedVehicles = budget.map((v) => ({
        id: v.id,
        name: `${v.brand} ${v.model}`,
        category: v.category.name,
        price: Number(v.dailyRate),
        image: v.primaryImageUrl,
      }));
    } else if (cleanPrompt.includes('document') || cleanPrompt.includes('license') || cleanPrompt.includes('requirement')) {
      reply = `To rent a vehicle with Finovo, you need:\n1. A valid driving license (held for at least 1 year)\n2. National Identity Card or Passport\n3. Proof of address / utility bill\n\nYou can upload and verify these directly in your Driver Documents tab.`;
    } else if (cleanPrompt.includes('fuel') || cleanPrompt.includes('mileage') || cleanPrompt.includes('policy')) {
      reply = `Finovo operates on a standard **Same-to-Same Fuel Policy** (return with the same fuel level as pickup). Standard daily rentals include **250 km per day**, with additional kilometers charged at transparent excess mileage rates displayed on each vehicle card.`;
    } else if (cleanPrompt.includes('my booking') || cleanPrompt.includes('trip') || cleanPrompt.includes('status')) {
      if (customerBookings.length > 0) {
        const b = customerBookings[0];
        reply = `You have reservation #${b.bookingNumber} for a **${b.vehicle.brand} ${b.vehicle.model}** currently in **${b.status}** status. Pickup is scheduled for ${new Date(b.pickupDateTime).toLocaleDateString()}.`;
      } else {
        reply = `You do not have any active reservations right now. Feel free to browse our fleet and pick the ideal car for your upcoming trip!`;
      }
    } else {
      reply = `Hello ${customer.fullName}! I'm Finovo's AI Rental Assistant. I can help you search available vehicles, clarify fuel and deposit policies, review your current bookings, or guide you through vehicle inspection and pickup. What can I help you with today?`;
      suggestedVehicles = vehicles.slice(0, 2).map((v) => ({
        id: v.id,
        name: `${v.brand} ${v.model}`,
        category: v.category.name,
        price: Number(v.dailyRate),
        image: v.primaryImageUrl,
      }));
    }

    return { reply, suggestedVehicles };
  }

  /**
   * Rewards, Loyalty Tier & Personal Referral Program
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
    let nextTier = 'Gold';
    let progressPercent = 35;
    if (pointsBalance >= 2000) {
      tier = 'Platinum';
      nextTier = 'VIP Diamond';
      progressPercent = 100;
    } else if (pointsBalance >= 500) {
      tier = 'Gold';
      nextTier = 'Platinum';
      progressPercent = Math.min(100, Math.round((pointsBalance / 2000) * 100));
    } else {
      progressPercent = Math.min(100, Math.round((pointsBalance / 500) * 100));
    }

    const referralCode = `FINOVO-REF-${customer.id.slice(-6).toUpperCase()}`;

    return {
      tier,
      nextTier,
      progressPercent,
      pointsBalance,
      totalSpent,
      referralCode,
      referralBonusPoints: 150,
      vouchers: [
        {
          code: 'WELCOME10',
          discount: '10% OFF',
          description: '10% discount on any booking over 3 days',
          validUntil: '2026-12-31',
          isAvailable: true,
        },
        {
          code: 'FREEDRIVER',
          discount: 'Free Add-on',
          description: 'Free additional driver fee on luxury rentals',
          validUntil: '2026-11-30',
          isAvailable: pointsBalance >= 200,
        },
        {
          code: 'WEEKEND20',
          discount: 'PKR 2,000 OFF',
          description: 'Flat PKR 2,000 discount on weekend getaways',
          validUntil: '2026-12-15',
          isAvailable: pointsBalance >= 400,
        },
      ],
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
        rating: Math.min(5, Math.max(1, payload.rating)),
        comment: payload.comment || null,
      },
      create: {
        bookingId: payload.bookingId,
        vehicleId: payload.vehicleId || booking.vehicleId,
        customerId: customer.id,
        rating: Math.min(5, Math.max(1, payload.rating)),
        comment: payload.comment || null,
        isApproved: true,
      },
    });

    return review;
  }
}
