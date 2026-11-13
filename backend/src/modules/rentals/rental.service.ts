import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { RentalPricingService } from '../fleet/rental-pricing.service';
import { PICKUP_SCAN_VALID_HOURS } from '../inspections/inspection.service';

export interface HandoverDTO {
  bookingId: string;
  startMileage: number;
  startFuelLevel: string;
  notes?: string;
  /** AI pickup inspection performed right before the keys are handed over (required). */
  pickupInspectionId: string;
}

export interface ReturnVehicleDTO {
  rentalId: string;
  endMileage: number;
  endFuelLevel: string;
  /** AI return inspection that was compared against the pickup inspection (required for the final return). */
  returnInspectionId?: string;
  fuelDiscrepancyCharge?: number;
  additionalAdjustment?: number;
  conditionNotes?: string;
  /** Send the car to the garage after return: it becomes unavailable for booking. */
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
        currency: snap.currency || env.CURRENCY,
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
      currency: booking.currency || env.CURRENCY,
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
          orderBy: { createdAt: 'asc' },
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
   * Damage fines come only from the AI return comparison (charges the staff did not waive).
   */
  private static async resolveDamageCharges(rentalId: string, returnInspectionId?: string) {
    if (!returnInspectionId) {
      return { comparisonId: null as string | null, damageCharge: 0, chargeIds: [] as string[] };
    }
    const inspection = await prisma.inspection.findUnique({ where: { id: returnInspectionId } });
    if (!inspection || inspection.type !== 'RETURN' || inspection.rentalId !== rentalId) {
      throw AppError.badRequest('The return inspection does not belong to this rental');
    }
    const comparison = await prisma.damage_comparisons.findFirst({
      where: { returnInspectionId },
      include: { damage_charges: true },
    });
    if (!comparison) {
      throw AppError.badRequest('The return inspection has no comparison with the pickup inspection');
    }
    const active = comparison.damage_charges.filter((c) => c.status !== 'REJECTED' && c.status !== 'SETTLED');
    const damageCharge = Math.round(active.reduce((sum, c) => sum + Number(c.proposedAmount), 0) * 100) / 100;
    return { comparisonId: comparison.id, damageCharge, chargeIds: active.map((c) => c.id) };
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
    const damage = await this.resolveDamageCharges(rental.id, dto.returnInspectionId);

    const settlement = RentalPricingService.calculateSettlement({
      snapshot,
      agreedPickupDateTime: rental.booking.pickupDateTime,
      agreedReturnDateTime: rental.booking.returnDateTime,
      actualPickupDateTime: rental.pickedUpAt,
      actualReturnDateTime: returnTime,
      startOdometer: rental.startMileage,
      endOdometer: endMileage,
      fuelDiscrepancyCharge: Number(dto.fuelDiscrepancyCharge ?? (dto as any).fuelCharges ?? 0),
      damageCharge: damage.damageCharge,
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

    if (!['CONFIRMED', 'READY_FOR_PICKUP'].includes(booking.status)) {
      throw AppError.badRequest(`Booking #${booking.bookingNumber} is ${booking.status} and cannot be handed over`);
    }

    const startMileage = Number(dto.startMileage);
    if (!Number.isFinite(startMileage) || startMileage < 0) {
      throw AppError.badRequest('A valid starting odometer reading is required');
    }

    // Keys can only be handed over after a fresh AI pickup inspection of this exact vehicle
    if (!dto.pickupInspectionId) {
      throw AppError.badRequest('Run the AI pickup inspection before handing over the keys');
    }
    const pickupInspection = await prisma.inspection.findUnique({ where: { id: dto.pickupInspectionId } });
    if (
      !pickupInspection ||
      pickupInspection.type !== 'PICKUP' ||
      pickupInspection.vehicleId !== booking.vehicleId ||
      pickupInspection.rentalId !== null
    ) {
      throw AppError.badRequest('The pickup inspection does not belong to this vehicle or was already used');
    }
    const ageHours = (Date.now() - pickupInspection.createdAt.getTime()) / 3_600_000;
    if (ageHours > PICKUP_SCAN_VALID_HOURS) {
      throw AppError.badRequest('The pickup inspection is too old. Please scan the vehicle again before handover.');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Rental record
      const rental = await tx.rental.create({
        data: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          startMileage,
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
        data: { status: 'RENTED', mileage: startMileage },
      });

      // 4. Record Odometer Log for handover
      await tx.vehicleOdometerLog.create({
        data: {
          vehicleId: booking.vehicleId,
          bookingId: booking.id,
          odometerReading: startMileage,
          source: 'CHECK_OUT',
          recordedBy: staffUserId || 'Fleet Staff',
          notes: `Vehicle pickup handover for booking #${booking.bookingNumber}`,
        },
      });

      // 5. Attach the AI pickup inspection as the baseline of this rental
      await tx.inspection.update({
        where: { id: pickupInspection.id },
        data: { rentalId: rental.id, status: 'FINALIZED' },
      });

      // 6. Audit Log
      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'VEHICLE_HANDOVER_COMPLETED',
          metadata: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            vehicleId: booking.vehicleId,
            startMileage,
            fuelLevel: dto.startFuelLevel,
            pickupInspectionId: pickupInspection.id,
            conditionScore: pickupInspection.overallScore,
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

    // The final return requires the AI return inspection (pickup vs return comparison)
    if (!dto.returnInspectionId) {
      throw AppError.badRequest('Run the AI return inspection before completing the return');
    }
    const damage = await this.resolveDamageCharges(rental.id, dto.returnInspectionId);

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
      fuelDiscrepancyCharge: Number(dto.fuelDiscrepancyCharge ?? (dto as any).fuelCharges ?? 0),
      damageCharge: damage.damageCharge,
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

      // 5. Finalize the AI return inspection, settle its fines and (optionally) send the car to the garage
      await tx.inspection.update({
        where: { id: dto.returnInspectionId! },
        data: { status: 'FINALIZED' },
      });

      if (damage.comparisonId) {
        await tx.damage_comparisons.update({
          where: { id: damage.comparisonId },
          data: {
            status: 'APPROVED',
            totalApprovedCharges: damage.damageCharge,
            reviewerId: staffUserId || null,
            reviewedAt: returnTime,
            updatedAt: returnTime,
          },
        });
        for (const chargeId of damage.chargeIds) {
          const charge = await tx.damage_charges.findUnique({ where: { id: chargeId } });
          if (!charge) continue;
          await tx.damage_charges.update({
            where: { id: chargeId },
            data: {
              status: 'SETTLED',
              approvedAmount: charge.proposedAmount,
              approvedById: charge.approvedById || staffUserId || null,
              approvedAt: charge.approvedAt || returnTime,
              updatedAt: returnTime,
            },
          });
        }
      }

      if (dto.sendToMaintenance) {
        const charges = damage.comparisonId
          ? await tx.damage_charges.findMany({ where: { comparisonId: damage.comparisonId, status: 'SETTLED' } })
          : [];
        await tx.vehicleMaintenance.create({
          data: {
            vehicleId: rental.vehicleId,
            maintenanceType: charges.length > 0 ? 'BODY_WORK' : 'REPAIR',
            status: 'IN_PROGRESS',
            title: `Garage after return of booking #${rental.booking.bookingNumber}`,
            description:
              charges.length > 0
                ? charges.map((c) => `- ${c.description}`).join('\n')
                : dto.conditionNotes || 'Sent to garage after return inspection',
            scheduledDate: returnTime,
            startDate: returnTime,
            odometerReading: endMileage,
            currency: rental.booking.currency,
            createdBy: staffUserId || 'Fleet Staff',
          },
        });
      }

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
            returnInspectionId: dto.returnInspectionId,
            damageCharge: damage.damageCharge,
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

