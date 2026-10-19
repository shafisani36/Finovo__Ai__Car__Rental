import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { RentalPricingService } from '../fleet/rental-pricing.service';

export interface HandoverDTO {
  bookingId: string;
  startMileage: number;
  startFuelLevel: string;
  notes?: string;
}

export interface ReturnVehicleDTO {
  rentalId: string;
  endMileage: number;
  endFuelLevel: string;
  damageCharge?: number;
  fuelDiscrepancyCharge?: number;
  additionalAdjustment?: number;
  conditionNotes?: string;
  sendToMaintenance?: boolean;
}

export class RentalService {
  /**
   * Helper to construct calculation snapshot from booking
   */
  private static extractSnapshot(booking: any) {
    if (booking.pricingSnapshot) {
      const snap = booking.pricingSnapshot;
      return {
        pricingMethod: snap.pricingMethod,
        currency: snap.currency || 'PKR',
        dailyRate: snap.dailyRate ? Number(snap.dailyRate) : null,
        perKmRate: snap.perKmRate ? Number(snap.perKmRate) : null,
        hourlyRate: snap.hourlyRate ? Number(snap.hourlyRate) : null,
        monthlyRate: snap.monthlyRate ? Number(snap.monthlyRate) : null,
        excessMileageRate: snap.excessMileageRate ? Number(snap.excessMileageRate) : null,
        minimumTripCharge: snap.minimumTripCharge ? Number(snap.minimumTripCharge) : null,
        includedKmPerDay: snap.includedKmPerDay,
        includedKmPerBooking: snap.includedKmPerBooking,
        minimumBillableHours: snap.minimumBillableHours,
        billingIncrementMinutes: snap.billingIncrementMinutes,
        gracePeriodMinutes: snap.gracePeriodMinutes ?? 30,
        partialMonthPolicy: snap.partialMonthPolicy,
        depositAmount: snap.depositAmount ? Number(snap.depositAmount) : null,
        taxRatePercent: snap.taxRatePercent ? Number(snap.taxRatePercent) : 8,
      };
    }

    // Fallback for legacy records
    return {
      pricingMethod: booking.pricingMethod || 'daily',
      currency: booking.currency || 'PKR',
      dailyRate: Number(booking.dailyRate || 0),
      perKmRate: null,
      hourlyRate: null,
      monthlyRate: null,
      excessMileageRate: 50,
      minimumTripCharge: null,
      includedKmPerDay: 200,
      includedKmPerBooking: 200 * (booking.totalDays || 1),
      minimumBillableHours: 1,
      billingIncrementMinutes: 60,
      gracePeriodMinutes: 30,
      partialMonthPolicy: 'prorated_daily',
      depositAmount: Number(booking.depositAmount || 0),
      taxRatePercent: 8,
    };
  }

  /**
   * Lists all operational rentals (active and completed)
   */
  static async listRentals(status?: string) {
    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const rentals = await prisma.rental.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            customer: true,
            pickupBranch: true,
            returnBranch: true,
            pricingSnapshot: true,
            breakdownItems: true,
          },
        },
        vehicle: {
          include: {
            category: true,
          },
        },
        inspections: {
          include: {
            findings: true,
          },
        },
      },
    });

    return rentals;
  }

  /**
   * Retrieves single rental by ID
   */
  static async getById(id: string) {
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            customer: true,
            pickupBranch: true,
            returnBranch: true,
            pricingSnapshot: true,
            breakdownItems: true,
          },
        },
        vehicle: {
          include: {
            category: true,
            photos: true,
          },
        },
        inspections: {
          include: {
            findings: true,
            photos: true,
          },
        },
      },
    });

    if (!rental) {
      throw AppError.notFound('Rental record not found');
    }

    return rental;
  }

  /**
   * Previews settlement calculations before final submission
   */
  static async previewSettlement(dto: ReturnVehicleDTO) {
    const rental = await prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: {
        booking: {
          include: { pricingSnapshot: true },
        },
        vehicle: true,
      },
    });

    if (!rental) {
      throw AppError.notFound('Rental record not found for settlement preview');
    }

    const endMileage = Number(dto.endMileage);
    if (isNaN(endMileage) || endMileage < rental.startMileage) {
      throw AppError.badRequest(
        `Ending odometer (${dto.endMileage}) cannot be lower than starting odometer (${rental.startMileage})`
      );
    }

    const snapshot = this.extractSnapshot(rental.booking);
    const returnTime = new Date();

    const settlement = RentalPricingService.calculateSettlement({
      snapshot,
      agreedPickupDateTime: rental.booking.pickupDateTime,
      agreedReturnDateTime: rental.booking.returnDateTime,
      actualPickupDateTime: rental.pickedUpAt,
      actualReturnDateTime: returnTime,
      startOdometer: rental.startMileage,
      endOdometer: endMileage,
      fuelDiscrepancyCharge: Number(dto.fuelDiscrepancyCharge || 0),
      damageCharge: Number(dto.damageCharge || 0),
      additionalAdjustment: Number(dto.additionalAdjustment || 0),
      amountAlreadyPaid: Number(rental.booking.totalAmount || 0),
    });

    return {
      rentalId: rental.id,
      bookingNumber: rental.booking.bookingNumber,
      vehicle: `${rental.vehicle.brand} ${rental.vehicle.model}`,
      ...settlement,
    };
  }

  /**
   * Executes vehicle handover (Pickup operation)
   */
  static async handover(dto: HandoverDTO, staffUserId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { vehicle: true, rental: true },
    });

    if (!booking) {
      throw AppError.notFound('Booking not found for handover');
    }

    if (booking.rental) {
      throw AppError.badRequest('Vehicle has already been handed over for this booking');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
      throw AppError.badRequest(`Cannot handover cancelled booking #${booking.bookingNumber}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Rental record
      const rental = await tx.rental.create({
        data: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          startMileage: Number(dto.startMileage),
          startFuelLevel: dto.startFuelLevel || '100%',
          pickedUpAt: new Date(),
          status: 'ACTIVE',
        },
      });

      // 2. Update Booking status to ACTIVE
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'ACTIVE' },
      });

      // 3. Update Vehicle status to RENTED
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'RENTED', mileage: Number(dto.startMileage) },
      });

      // 4. Record Odometer Log for handover
      await tx.vehicleOdometerLog.create({
        data: {
          vehicleId: booking.vehicleId,
          bookingId: booking.id,
          odometerReading: Number(dto.startMileage),
          source: 'CHECK_OUT',
          recordedBy: staffUserId || 'Fleet Staff',
          notes: `Vehicle pickup handover for booking #${booking.bookingNumber}`,
        },
      });

      // 5. Create Initial Pickup Inspection record
      await tx.inspection.create({
        data: {
          rentalId: rental.id,
          vehicleId: booking.vehicleId,
          type: 'PICKUP',
          performedById: staffUserId || null,
          overallScore: 99.0,
          summary: `Pickup handover completed. Starting mileage: ${dto.startMileage} km, Fuel: ${dto.startFuelLevel}. ${dto.notes || 'No pre-existing critical damage.'}`,
          hasDamageDetected: false,
        },
      });

      // 6. Audit Log
      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'VEHICLE_HANDOVER_COMPLETED',
          metadata: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            vehicleId: booking.vehicleId,
            startMileage: dto.startMileage,
            fuelLevel: dto.startFuelLevel,
          }),
        },
      });

      return rental;
    });

    return result;
  }

  /**
   * Executes vehicle return and final financial settlement
   */
  static async returnVehicle(dto: ReturnVehicleDTO, staffUserId?: string) {
    const rental = await prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: {
        booking: {
          include: { pricingSnapshot: true },
        },
        vehicle: true,
      },
    });

    if (!rental) {
      throw AppError.notFound('Rental record not found for return processing');
    }

    if (rental.status === 'RETURNED') {
      throw AppError.badRequest('This rental has already been marked returned');
    }

    const endMileage = Number(dto.endMileage);
    if (isNaN(endMileage) || endMileage < rental.startMileage) {
      throw AppError.badRequest(
        `Ending odometer (${dto.endMileage}) cannot be lower than starting odometer (${rental.startMileage})`
      );
    }

    const returnTime = new Date();
    const snapshot = this.extractSnapshot(rental.booking);

    // Calculate final settlement deterministically
    const settlement = RentalPricingService.calculateSettlement({
      snapshot,
      agreedPickupDateTime: rental.booking.pickupDateTime,
      agreedReturnDateTime: rental.booking.returnDateTime,
      actualPickupDateTime: rental.pickedUpAt,
      actualReturnDateTime: returnTime,
      startOdometer: rental.startMileage,
      endOdometer: endMileage,
      fuelDiscrepancyCharge: Number(dto.fuelDiscrepancyCharge || 0),
      damageCharge: Number(dto.damageCharge || 0),
      additionalAdjustment: Number(dto.additionalAdjustment || 0),
      amountAlreadyPaid: Number(rental.booking.totalAmount || 0),
    });

    const nextVehicleStatus = dto.sendToMaintenance ? 'MAINTENANCE' : 'AVAILABLE';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Rental record with full settlement accounting
      const updatedRental = await tx.rental.update({
        where: { id: rental.id },
        data: {
          endMileage,
          endFuelLevel: dto.endFuelLevel || '100%',
          returnedAt: returnTime,
          status: 'RETURNED',
          verifiedBillableKm: settlement.odometer.actualDistanceTraveled,
          extraKm: settlement.odometer.extraKm,
          extraKmCharge: settlement.odometer.extraKmCharge,
          lateReturnHours: settlement.duration.lateHours,
          lateReturnFee: settlement.duration.lateFee,
          damageCharges: settlement.breakdown.damageCharge,
          fuelCharges: settlement.breakdown.fuelCharge,
          depositRefundAmount: settlement.depositAccounting.refundableDeposit,
          depositDeductionAmount: settlement.depositAccounting.deductions,
          netPayableOrRefund: settlement.financialSummary.netPayableOrRefund,
          settlementNotes: dto.conditionNotes || null,
          settledAt: returnTime,
          settledBy: staffUserId || 'Fleet Staff',
        },
      });

      // 2. Update Booking with final total and SETTLED status
      await tx.booking.update({
        where: { id: rental.bookingId },
        data: {
          status: 'COMPLETED',
          finalTotal: settlement.breakdown.finalRentalTotal,
          settlementStatus: 'SETTLED',
        },
      });

      // 3. Add settlement line items to booking pricing breakdown
      const settlementLineItems = settlement.lineItems.filter(
        (item) => item.lineType !== 'base_rental' && item.amount !== 0
      );

      if (settlementLineItems.length > 0) {
        await tx.bookingPricingBreakdown.createMany({
          data: settlementLineItems.map((item) => ({
            bookingId: rental.bookingId,
            lineType: item.lineType,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
            currency: item.currency,
            isTaxable: item.isTaxable,
            taxAmount: item.taxAmount,
            metadata: 'SETTLEMENT',
          })),
        });
      }

      // 4. Update Vehicle status & current mileage
      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          status: nextVehicleStatus,
          mileage: endMileage,
        },
      });

      // 5. Create Return Inspection record
      await tx.inspection.create({
        data: {
          rentalId: rental.id,
          vehicleId: rental.vehicleId,
          type: 'RETURN',
          performedById: staffUserId || null,
          overallScore: dto.damageCharge ? 80.0 : 98.0,
          summary: `Return completed. Return odometer: ${endMileage} km, Fuel: ${dto.endFuelLevel}. ${dto.conditionNotes || 'No new critical damages reported.'}`,
          hasDamageDetected: Boolean(dto.damageCharge && dto.damageCharge > 0),
        },
      });

      // 6. Record Odometer Log
      await tx.vehicleOdometerLog.create({
        data: {
          vehicleId: rental.vehicleId,
          bookingId: rental.bookingId,
          odometerReading: endMileage,
          source: 'RETURN',
          recordedBy: staffUserId || 'Fleet Staff',
          notes: `Vehicle return odometer log for booking #${rental.booking.bookingNumber}`,
        },
      });

      // 7. Audit Log
      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'VEHICLE_RETURN_SETTLED',
          metadata: JSON.stringify({
            rentalId: rental.id,
            bookingNumber: rental.booking.bookingNumber,
            endMileage,
            endFuelLevel: dto.endFuelLevel,
            vehicleStatus: nextVehicleStatus,
            finalRentalTotal: settlement.breakdown.finalRentalTotal,
            netPayableOrRefund: settlement.financialSummary.netPayableOrRefund,
            depositRefund: settlement.depositAccounting.refundableDeposit,
          }),
        },
      });

      return {
        ...updatedRental,
        settlement,
      };
    });

    return result;
  }
}

