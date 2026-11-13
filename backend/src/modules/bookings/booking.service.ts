import { Prisma, $Enums } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../../shared/errors/app-error';
import { RentalPricingService, QuoteAddonInput } from '../fleet/rental-pricing.service';

export interface CreateBookingDTO {
  customerId?: string;
  vehicleId: string;
  pickupBranchId?: string;
  returnBranchId?: string;
  pickupDateTime: string; // ISO string
  returnDateTime: string;  // ISO string
  notes?: string;
  estimatedKm?: number;
  driverRequired?: boolean;
  addons?: string[];
}

export interface BookingActor {
  userId?: string;
  roles?: string[];
}

export interface BookingFilters {
  status?: string;
  search?: string;
  vehicleId?: string;
  customerId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

/**
 * Booking statuses that occupy a vehicle for their date range.
 * Cancelled, rejected, expired, completed, draft and quoted bookings never block a vehicle.
 */
export const BLOCKING_BOOKING_STATUSES = [
  'RESERVED',
  'PENDING',
  'CONFIRMED',
  'READY_FOR_PICKUP',
  'ACTIVE',
  'REQUIRES_REVIEW',
] as const;

/** Settlement status used while an online card payment is outstanding. */
export const AWAITING_PAYMENT_STATUS = 'AWAITING_PAYMENT';

/** How long an unpaid online booking holds the vehicle before it is released. */
export const PAYMENT_HOLD_MINUTES = 30;

/** Turnaround buffer kept free between two consecutive bookings of the same vehicle. */
export const TURNAROUND_BUFFER_MS = 2 * 60 * 60 * 1000;

/** Tax rate applied to every customer quote. */
export const BOOKING_TAX_RATE_PERCENT = 8;

/**
 * Server-side add-on catalog. Clients only send add-on codes; prices are always resolved here.
 */
export const BOOKING_ADDON_CATALOG: Record<string, QuoteAddonInput> = {
  PROTECTION_STANDARD: {
    code: 'PROTECTION_STANDARD',
    description: 'Standard protection plan',
    unitPrice: 35,
    chargeUnit: 'DAY',
  },
  PROTECTION_PREMIUM: {
    code: 'PROTECTION_PREMIUM',
    description: 'Premium protection plan',
    unitPrice: 75,
    chargeUnit: 'DAY',
  },
  GPS: { code: 'GPS', description: 'GPS navigation unit', unitPrice: 10, chargeUnit: 'DAY' },
  CHILD_SEAT: { code: 'CHILD_SEAT', description: 'Child safety seat', unitPrice: 8, chargeUnit: 'DAY' },
  EXTRA_DRIVER: { code: 'EXTRA_DRIVER', description: 'Additional driver', unitPrice: 15, chargeUnit: 'DAY' },
};

/** Longest rental and furthest pickup date a customer can book online. */
export const MAX_ONLINE_RENTAL_DAYS = 90;
export const MAX_ADVANCE_BOOKING_DAYS = 365;

/**
 * Two people booking the same car at the same moment make MySQL abort one serializable transaction.
 * Retry it a few times; if it still collides, the car was taken by the other request.
 */
async function withSerializableRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'P2034') throw err;
      if (attempt >= attempts) {
        throw AppError.conflict('This car was just booked by someone else for these dates. Please pick other dates or another car.');
      }
      await new Promise((resolve) => setTimeout(resolve, 40 * attempt + Math.floor(Math.random() * 40)));
    }
  }
}

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER', 'EMPLOYEE', 'MANAGER'];

/**
 * Builds the Prisma filter for bookings that block a vehicle inside [from, to).
 * Unpaid online bookings stop blocking once their payment hold expires.
 */
export function blockingBookingWhere(
  from: Date,
  to: Date,
  options: { excludeBookingId?: string; withBuffer?: boolean } = {}
): Prisma.BookingWhereInput {
  const buffer = options.withBuffer === false ? 0 : TURNAROUND_BUFFER_MS;
  const effectiveFrom = new Date(from.getTime() - buffer);
  const effectiveTo = new Date(to.getTime() + buffer);
  const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60 * 1000);

  return {
    ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
    status: { in: [...BLOCKING_BOOKING_STATUSES] },
    // Interval overlap: existingStart < requestedEnd AND existingEnd > requestedStart
    pickupDateTime: { lt: effectiveTo },
    returnDateTime: { gt: effectiveFrom },
    OR: [
      { settlementStatus: null },
      { settlementStatus: { not: AWAITING_PAYMENT_STATUS } },
      { createdAt: { gte: holdCutoff } },
    ],
  };
}

function resolveAddons(codes?: unknown): QuoteAddonInput[] {
  if (!Array.isArray(codes)) return [];
  const unique = Array.from(new Set(codes.map((c) => String(c).trim().toUpperCase())));
  const resolved: QuoteAddonInput[] = [];
  for (const code of unique) {
    const addon = BOOKING_ADDON_CATALOG[code];
    if (!addon) {
      throw AppError.badRequest(`Unknown booking add-on: ${code}`);
    }
    resolved.push(addon);
  }
  if (unique.includes('PROTECTION_STANDARD') && unique.includes('PROTECTION_PREMIUM')) {
    throw AppError.badRequest('Only one protection plan can be selected');
  }
  return resolved;
}

export class BookingService {
  /**
   * Half-open interval availability check: [pickup, return) with 2-hour turnaround buffer
   */
  static async checkAvailability(
    vehicleId: string,
    pickupDate: Date,
    returnDate: Date,
    excludeBookingId?: string
  ): Promise<{ available: boolean; conflictReason?: string }> {
    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      return { available: false, conflictReason: 'Invalid pickup or return date.' };
    }

    if (pickupDate >= returnDate) {
      return { available: false, conflictReason: 'Return date must be strictly after pickup date.' };
    }

    // Check if vehicle exists and is not archived or in long-term maintenance
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { category: true },
    });

    if (!vehicle) {
      return { available: false, conflictReason: 'Vehicle does not exist.' };
    }

    if (vehicle.status === 'ARCHIVED' || vehicle.deletedAt || !vehicle.isBookable) {
      return { available: false, conflictReason: 'Vehicle is decommissioned or not open for booking.' };
    }

    if (vehicle.status === 'MAINTENANCE') {
      return { available: false, conflictReason: 'Vehicle is currently offline for maintenance.' };
    }

    // Find conflicting overlapping reservations (includes turnaround buffer)
    const conflicts = await prisma.booking.findMany({
      where: { vehicleId, ...blockingBookingWhere(pickupDate, returnDate, { excludeBookingId }) },
      orderBy: { pickupDateTime: 'asc' },
      take: 1,
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return {
        available: false,
        conflictReason: `This car is not available from ${conflict.pickupDateTime.toISOString().slice(0, 10)} to ${conflict.returnDateTime.toISOString().slice(0, 10)}. Please choose different dates.`,
      };
    }

    return { available: true };
  }

  /**
   * Computes itemized pricing quote for a reservation using RentalPricingService
   */
  static async calculateQuote(
    vehicleId: string,
    pickupDate: Date,
    returnDate: Date,
    estimatedKm?: number,
    driverRequired?: boolean,
    addonCodes?: unknown
  ) {
    const addons = resolveAddons(addonCodes);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { category: true },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found for pricing calculation');
    }

    if (vehicle.status === 'ARCHIVED') {
      throw AppError.badRequest('Vehicle is decommissioned or archived');
    }

    const pricingQuote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: vehicle.pricingMethod,
        currency: vehicle.currency,
        dailyRate: vehicle.dailyRate ? Number(vehicle.dailyRate) : null,
        weeklyRate: vehicle.weeklyRate ? Number(vehicle.weeklyRate) : null,
        monthlyRate: vehicle.monthlyRate ? Number(vehicle.monthlyRate) : null,
        perKmRate: vehicle.perKmRate ? Number(vehicle.perKmRate) : null,
        hourlyRate: vehicle.hourlyRate ? Number(vehicle.hourlyRate) : null,
        minimumTripCharge: vehicle.minimumTripCharge ? Number(vehicle.minimumTripCharge) : null,
        minimumBillableHours: vehicle.minimumBillableHours,
        billingIncrementMinutes: vehicle.billingIncrementMinutes,
        gracePeriodMinutes: vehicle.gracePeriodMinutes,
        partialMonthPolicy: vehicle.partialMonthPolicy,
        securityDeposit: vehicle.securityDeposit ? Number(vehicle.securityDeposit) : null,
        mileageLimitPerDay: vehicle.mileageLimitPerDay,
        excessMileageFee: vehicle.excessMileageFee ? Number(vehicle.excessMileageFee) : null,
      },
      pickupDateTime: pickupDate,
      returnDateTime: returnDate,
      estimatedKm: estimatedKm ? Number(estimatedKm) : null,
      driverRequired: Boolean(driverRequired),
      taxRatePercent: BOOKING_TAX_RATE_PERCENT,
      addons,
    });

    return {
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      categoryName: vehicle.category.name,
      pricingMethod: pricingQuote.pricingMethod,
      currency: pricingQuote.currency,
      totalDays:
        pricingQuote.billableDuration.days ||
        Math.ceil(pricingQuote.billableDuration.hours / 24) ||
        1,
      billableDuration: pricingQuote.billableDuration,
      billableDistance: pricingQuote.billableDistance,
      ratesApplied: pricingQuote.ratesApplied,
      dailyRate: pricingQuote.ratesApplied.baseRate,
      subtotal: pricingQuote.subtotal,
      extraDistanceCharge: pricingQuote.extraDistanceCharge,
      driverFee: pricingQuote.driverFee,
      addonsTotal: pricingQuote.addonsTotal,
      selectedAddons: addons.map((a) => a.code),
      taxRatePercent: BOOKING_TAX_RATE_PERCENT,
      discountAmount: pricingQuote.discountAmount,
      taxableAmount: pricingQuote.taxableAmount,
      taxAmount: pricingQuote.taxAmount,
      depositAmount: pricingQuote.securityDeposit,
      rentalTotal: pricingQuote.rentalTotal,
      totalAmount: pricingQuote.rentalTotal,
      grandTotal: pricingQuote.grandTotal,
      lineItems: pricingQuote.lineItems,
      pricingEngineVersion: pricingQuote.pricingEngineVersion,
    };
  }

  /**
   * Creates an atomic booking with transactional verification, immutable pricing snapshot, and breakdowns
   */
  static async createBooking(dto: CreateBookingDTO, actor: BookingActor = {}) {
    const actorUserId = actor.userId;
    const isStaff = (actor.roles || []).some((r) => STAFF_ROLES.includes(r));

    if (!dto || !dto.vehicleId) {
      throw AppError.badRequest('vehicleId is required');
    }
    if (!isStaff) {
      await AuthService.assertEmailVerified(actorUserId);
    }

    const pickupDate = new Date(dto.pickupDateTime);
    const returnDate = new Date(dto.returnDateTime);

    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      throw AppError.badRequest('Invalid pickup or return date format');
    }

    if (returnDate.getTime() <= pickupDate.getTime()) {
      throw AppError.badRequest('Return date must be after the pickup date');
    }

    // Customers cannot book in the past (15 minute tolerance for clock skew)
    if (!isStaff && pickupDate.getTime() < Date.now() - 15 * 60 * 1000) {
      throw AppError.badRequest('Pickup date/time cannot be in the past');
    }

    // Online bookings have sane limits so nobody can block a car for years
    const DAY_MS = 24 * 60 * 60 * 1000;
    if (!isStaff && returnDate.getTime() - pickupDate.getTime() > MAX_ONLINE_RENTAL_DAYS * DAY_MS) {
      throw AppError.badRequest(`Online bookings can be at most ${MAX_ONLINE_RENTAL_DAYS} days. Contact us for longer rentals.`);
    }
    if (!isStaff && pickupDate.getTime() - Date.now() > MAX_ADVANCE_BOOKING_DAYS * DAY_MS) {
      throw AppError.badRequest(`Bookings can be made up to ${MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    // Initial availability pre-check
    const availCheck = await this.checkAvailability(dto.vehicleId, pickupDate, returnDate);
    if (availCheck.conflictReason === 'Vehicle does not exist.') {
      throw AppError.notFound('Vehicle not found');
    }
    if (!availCheck.available) {
      throw AppError.conflict(availCheck.conflictReason || 'Vehicle is not available for requested interval');
    }

    // Calculate server-authoritative quote
    const quote = await this.calculateQuote(
      dto.vehicleId,
      pickupDate,
      returnDate,
      dto.estimatedKm,
      dto.driverRequired,
      dto.addons
    );

    // Staff may book on behalf of any customer; customers always book for themselves
    let customer =
      isStaff && dto.customerId
        ? await prisma.customer.findUnique({ where: { id: dto.customerId } })
        : null;

    if (!customer && actorUserId) {
      customer = await prisma.customer.findFirst({
        where: { userId: actorUserId },
      });
      if (!customer) {
        const user = await prisma.user.findUnique({ where: { id: actorUserId } });
        if (user) {
          customer = await prisma.customer.create({
            data: {
              userId: user.id,
              email: user.email,
              fullName: user.fullName,
              phone: user.phone || null,
            },
          });
        }
      }
    }

    if (!customer) {
      throw AppError.notFound('Customer profile not found. Please log in or provide a valid customerId.');
    }
    const bookingCustomer = customer;

    // Resolve branches: explicit ids must exist, otherwise use the vehicle home branch or first active branch
    const resolveBranch = async (branchId?: string) => {
      if (branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) throw AppError.badRequest('Selected branch does not exist');
        return branch.id;
      }
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
        select: { branchId: true },
      });
      if (vehicle?.branchId) return vehicle.branchId;
      const firstBranch = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!firstBranch) throw AppError.badRequest('No rental branches configured in system');
      return firstBranch.id;
    };
    const pickupBranchId = await resolveBranch(dto.pickupBranchId);
    const returnBranchId = dto.returnBranchId
      ? await resolveBranch(dto.returnBranchId)
      : pickupBranchId;

    // Unique booking number: FIN-YYYY-<time><random>
    const bookingNumber = `FIN-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}${Math.floor(
      100 + Math.random() * 900
    )}`;

    // Online customer bookings wait for card payment; staff bookings are confirmed directly
    const initialStatus = isStaff ? 'CONFIRMED' : 'PENDING';
    const initialSettlement = isStaff ? 'PENDING' : AWAITING_PAYMENT_STATUS;

    // Execute atomic booking creation in a serializable transaction to prevent double booking
    const booking = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
      const conflicts = await tx.booking.findMany({
        where: { vehicleId: dto.vehicleId, ...blockingBookingWhere(pickupDate, returnDate) },
        take: 1,
      });

      if (conflicts.length > 0) {
        throw AppError.conflict(
          'This car was just reserved by another customer for the selected dates. Please choose different dates.'
        );
      }

      // Create booking record
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: bookingCustomer.id,
          vehicleId: dto.vehicleId,
          pickupBranchId,
          returnBranchId,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          status: initialStatus,
          pricingMethod: quote.pricingMethod,
          dailyRate: quote.ratesApplied.baseRate,
          totalDays: quote.totalDays,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          depositAmount: quote.depositAmount,
          totalAmount: quote.rentalTotal,
          finalTotal: null,
          settlementStatus: initialSettlement,
          currency: quote.currency,
          notes: dto.notes || null,
        },
        include: {
          customer: true,
          vehicle: { include: { category: true } },
          pickupBranch: true,
          returnBranch: true,
        },
      });

      // Create immutable pricing snapshot
      await tx.bookingPricingSnapshot.create({
        data: {
          bookingId: created.id,
          pricingMethod: quote.pricingMethod,
          currency: quote.currency,
          dailyRate: quote.ratesApplied.baseRate,
          perKmRate: quote.ratesApplied.extraKmRate || null,
          hourlyRate: quote.pricingMethod === 'hourly' ? quote.ratesApplied.baseRate : null,
          monthlyRate: quote.pricingMethod === 'monthly' ? quote.ratesApplied.baseRate : null,
          excessMileageRate: quote.ratesApplied.extraKmRate || null,
          minimumTripCharge: quote.ratesApplied.minimumTripCharge || null,
          includedKmPerDay: quote.billableDistance.includedKm
            ? Math.round(quote.billableDistance.includedKm / (quote.totalDays || 1))
            : null,
          includedKmPerBooking: quote.billableDistance.includedKm || null,
          minimumBillableHours: 1,
          billingIncrementMinutes: 60,
          gracePeriodMinutes: 30,
          partialMonthPolicy: 'prorated_daily',
          depositAmount: quote.depositAmount,
          taxRatePercent: BOOKING_TAX_RATE_PERCENT,
          pricingEngineVersion: quote.pricingEngineVersion,
          rawConfigSnapshot: JSON.stringify(quote),
          quotedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      // Create itemized pricing breakdown line items
      if (quote.lineItems && quote.lineItems.length > 0) {
        await tx.bookingPricingBreakdown.createMany({
          data: quote.lineItems.map((item) => ({
            bookingId: created.id,
            lineType: item.lineType,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
            currency: item.currency,
            isTaxable: item.isTaxable,
            taxAmount: item.taxAmount,
          })),
        });
      }

      // Audit log
      await tx.securityAuditLog.create({
        data: {
          userId: actorUserId || null,
          event: 'BOOKING_CREATED',
          metadata: JSON.stringify({
            bookingNumber,
            vehicle: `${created.vehicle.brand} ${created.vehicle.model}`,
            customer: created.customer.fullName,
            pricingMethod: quote.pricingMethod,
            rentalTotal: quote.rentalTotal,
            depositAmount: quote.depositAmount,
            currency: quote.currency,
          }),
        },
      });

      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    return booking;
  }

  /**
   * Lists bookings with pagination, status filters, and search
   */
  static async listBookings(filters: BookingFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 15));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { bookingNumber: { contains: q } },
        { customer: { fullName: { contains: q } } },
        { customer: { email: { contains: q } } },
        { vehicle: { brand: { contains: q } } },
        { vehicle: { model: { contains: q } } },
        { vehicle: { registrationNumber: { contains: q } } },
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
          customer: true,
          vehicle: { include: { category: true } },
          pickupBranch: true,
          returnBranch: true,
          rental: true,
        },
      }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single booking by ID
   */
  static async getById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: {
          include: {
            category: true,
            photos: true,
          },
        },
        pickupBranch: true,
        returnBranch: true,
        pricingSnapshot: true,
        breakdownItems: true,
        rental: {
          include: {
            inspections: {
              include: {
                findings: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    return booking;
  }

  /**
   * Updates booking status (transitions: CONFIRMED -> ACTIVE, or CANCELLED)
   */
  static async updateStatus(id: string, newStatus: string, reason?: string, actorUserId?: string) {
    const validStatuses: string[] = Object.values($Enums.bookings_status);
    if (!validStatuses.includes(newStatus)) {
      throw AppError.badRequest(`Invalid booking status: ${newStatus}`);
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    // Re-activating a released booking must not double-book the vehicle
    const blocking = BLOCKING_BOOKING_STATUSES as readonly string[];
    if (blocking.includes(newStatus) && !blocking.includes(booking.status)) {
      const availability = await this.checkAvailability(
        booking.vehicleId,
        booking.pickupDateTime,
        booking.returnDateTime,
        booking.id
      );
      if (!availability.available) {
        throw AppError.conflict(availability.conflictReason || 'Vehicle is not available for this booking period');
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: newStatus as any,
        notes: reason ? `${booking.notes ? booking.notes + '\n' : ''}[Status ${newStatus}]: ${reason}` : booking.notes,
      },
      include: {
        customer: true,
        vehicle: true,
      },
    });

    await prisma.securityAuditLog.create({
      data: {
        userId: actorUserId || null,
        event: 'BOOKING_STATUS_UPDATED',
        metadata: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          oldStatus: booking.status,
          newStatus,
          reason,
        }),
      },
    });

    return updated;
  }

  /**
   * Returns reservation events for the Fleet Calendar
   */
  static async getCalendarEvents(startDateStr?: string, endDateStr?: string) {
    const start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDateStr ? new Date(endDateStr) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: [...BLOCKING_BOOKING_STATUSES, 'COMPLETED'] },
        AND: [
          { pickupDateTime: { lte: end } },
          { returnDateTime: { gte: start } },
        ],
      },
      include: {
        vehicle: {
          select: { id: true, brand: true, model: true, registrationNumber: true, primaryImageUrl: true },
        },
        customer: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { pickupDateTime: 'asc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: `${b.vehicle.brand} ${b.vehicle.model} (${b.vehicle.registrationNumber}) - ${b.customer.fullName}`,
      start: b.pickupDateTime,
      end: b.returnDateTime,
      status: b.status,
      vehicleId: b.vehicle.id,
      vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
      registration: b.vehicle.registrationNumber,
      customerName: b.customer.fullName,
      totalAmount: Number(b.totalAmount),
    }));
  }
}
