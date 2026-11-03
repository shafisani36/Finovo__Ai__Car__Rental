import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { RentalPricingService } from '../fleet/rental-pricing.service';
import { PricingMethod } from '@prisma/client';

export interface CreateBookingDTO {
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string; // ISO string
  returnDateTime: string;  // ISO string
  notes?: string;
  estimatedKm?: number;
  driverRequired?: boolean;
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

    if (vehicle.status === 'ARCHIVED') {
      return { available: false, conflictReason: 'Vehicle is decommissioned or archived.' };
    }

    // Turnaround buffer (2 hours)
    const bufferMs = 2 * 60 * 60 * 1000;
    const effectivePickup = new Date(pickupDate.getTime() - bufferMs);
    const effectiveReturn = new Date(returnDate.getTime() + bufferMs);

    // Find conflicting overlapping reservations
    const conflicts = await prisma.booking.findMany({
      where: {
        vehicleId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ['CONFIRMED', 'ACTIVE', 'PENDING'] },
        // Interval overlap formula: existingStart < requestedEnd AND existingEnd > requestedStart
        AND: [
          { pickupDateTime: { lt: effectiveReturn } },
          { returnDateTime: { gt: effectivePickup } },
        ],
      },
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return {
        available: false,
        conflictReason: `Vehicle already reserved for booking #${conflict.bookingNumber} (${conflict.pickupDateTime.toISOString().slice(0, 10)} to ${conflict.returnDateTime.toISOString().slice(0, 10)})`,
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
    driverRequired?: boolean
  ) {
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
      taxRatePercent: 8,
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
  static async createBooking(dto: CreateBookingDTO, actorUserId?: string) {
    const pickupDate = new Date(dto.pickupDateTime);
    const returnDate = new Date(dto.returnDateTime);

    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      throw AppError.badRequest('Invalid pickup or return date format');
    }

    // Initial availability pre-check
    const availCheck = await this.checkAvailability(dto.vehicleId, pickupDate, returnDate);
    if (!availCheck.available) {
      throw AppError.conflict(availCheck.conflictReason || 'Vehicle is not available for requested interval');
    }

    // Calculate server-authoritative quote
    const quote = await this.calculateQuote(
      dto.vehicleId,
      pickupDate,
      returnDate,
      dto.estimatedKm,
      dto.driverRequired
    );

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw AppError.notFound('Customer profile not found');
    }

    // Generate unique booking number: FIN-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `FIN-${new Date().getFullYear()}-${randomSuffix}`;

    // Execute atomic booking creation in Prisma transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Re-verify availability within transaction for bulletproof concurrency
      const bufferMs = 2 * 60 * 60 * 1000;
      const effectivePickup = new Date(pickupDate.getTime() - bufferMs);
      const effectiveReturn = new Date(returnDate.getTime() + bufferMs);

      const conflicts = await tx.booking.findMany({
        where: {
          vehicleId: dto.vehicleId,
          status: { in: ['CONFIRMED', 'ACTIVE', 'PENDING'] },
          AND: [
            { pickupDateTime: { lt: effectiveReturn } },
            { returnDateTime: { gt: effectivePickup } },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw AppError.conflict(
          `Vehicle was just reserved by another customer for booking #${conflicts[0].bookingNumber}`
        );
      }

      // Create booking record
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          pickupBranchId: dto.pickupBranchId,
          returnBranchId: dto.returnBranchId,
          pickupDateTime: pickupDate,
          returnDateTime: returnDate,
          status: 'CONFIRMED',
          pricingMethod: quote.pricingMethod,
          dailyRate: quote.ratesApplied.baseRate,
          totalDays: quote.totalDays,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          depositAmount: quote.depositAmount,
          totalAmount: quote.rentalTotal,
          finalTotal: null,
          settlementStatus: 'PENDING',
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
          taxRatePercent: 8,
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
    });

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
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw AppError.notFound('Booking not found');
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
        status: { in: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] },
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
