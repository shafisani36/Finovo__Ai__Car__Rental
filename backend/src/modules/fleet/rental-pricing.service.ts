import { PricingMethod } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';

export interface VehiclePricingConfig {
  id?: string;
  pricingMethod: PricingMethod;
  currency: string;
  dailyRate?: number | string | null;
  weeklyRate?: number | string | null;
  monthlyRate?: number | string | null;
  perKmRate?: number | string | null;
  hourlyRate?: number | string | null;
  minimumTripCharge?: number | string | null;
  minimumBillableHours?: number | null;
  billingIncrementMinutes?: number | null;
  gracePeriodMinutes?: number | null;
  partialMonthPolicy?: string | null;
  securityDeposit?: number | string | null;
  mileageLimitPerDay?: number | null;
  excessMileageFee?: number | string | null;
}

export interface QuoteCalculationRequest {
  pricingConfig: VehiclePricingConfig;
  pickupDateTime: Date | string;
  returnDateTime: Date | string;
  estimatedKm?: number | null;
  driverRequired?: boolean;
  driverFeePerDay?: number;
  discountPercent?: number;
  taxRatePercent?: number;
}

export interface SettlementCalculationRequest {
  snapshot: {
    pricingMethod: PricingMethod;
    currency: string;
    dailyRate?: number | null;
    perKmRate?: number | null;
    hourlyRate?: number | null;
    monthlyRate?: number | null;
    excessMileageRate?: number | null;
    minimumTripCharge?: number | null;
    includedKmPerDay?: number | null;
    includedKmPerBooking?: number | null;
    minimumBillableHours?: number | null;
    billingIncrementMinutes?: number | null;
    gracePeriodMinutes?: number | null;
    partialMonthPolicy?: string | null;
    depositAmount?: number | null;
    taxRatePercent?: number | null;
  };
  agreedPickupDateTime: Date | string;
  agreedReturnDateTime: Date | string;
  actualPickupDateTime: Date | string;
  actualReturnDateTime: Date | string;
  startOdometer: number;
  endOdometer: number;
  fuelDiscrepancyCharge?: number;
  damageCharge?: number;
  additionalAdjustment?: number;
  amountAlreadyPaid?: number;
}

export interface PricingBreakdownLineItem {
  lineType:
    | 'base_rental'
    | 'extra_km'
    | 'driver_fee'
    | 'delivery_fee'
    | 'addon'
    | 'discount'
    | 'tax'
    | 'late_return'
    | 'damage_charge'
    | 'fuel'
    | 'deposit'
    | 'manual_adjustment'
    | 'refund_adjustment';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  currency: string;
  isTaxable: boolean;
  taxAmount: number;
}

export interface CalculationQuoteResult {
  pricingMethod: PricingMethod;
  currency: string;
  billableDuration: {
    hours: number;
    days: number;
    months: number;
    description: string;
  };
  billableDistance: {
    estimatedKm: number;
    includedKm: number;
    extraKm: number;
  };
  ratesApplied: {
    baseRate: number;
    rateUnit: string;
    minimumTripCharge?: number;
    extraKmRate?: number;
  };
  subtotal: number;
  extraDistanceCharge: number;
  driverFee: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  rentalTotal: number;
  securityDeposit: number;
  grandTotal: number; // rentalTotal + securityDeposit
  lineItems: PricingBreakdownLineItem[];
  pricingEngineVersion: string;
}

export interface SettlementResult {
  pricingMethod: PricingMethod;
  currency: string;
  odometer: {
    startOdometer: number;
    endOdometer: number;
    actualDistanceTraveled: number;
    includedKm: number;
    extraKm: number;
    extraKmRate: number;
    extraKmCharge: number;
  };
  duration: {
    agreedHours: number;
    actualHours: number;
    gracePeriodMinutes: number;
    lateHours: number;
    lateFee: number;
  };
  breakdown: {
    baseRental: number;
    extraKmCharge: number;
    lateFee: number;
    damageCharge: number;
    fuelCharge: number;
    manualAdjustment: number;
    taxAmount: number;
    finalRentalTotal: number;
  };
  depositAccounting: {
    originalDeposit: number;
    deductions: number;
    refundableDeposit: number;
  };
  financialSummary: {
    totalBilled: number;
    amountAlreadyPaid: number;
    netPayableOrRefund: number; // positive = customer owes; negative = refund to customer
    isRefundDue: boolean;
  };
  lineItems: PricingBreakdownLineItem[];
}

export class RentalPricingService {
  public static readonly VERSION = 'v1.0.0';

  /**
   * Helper to round monetary amounts to exactly 2 decimal places (cents / minor units)
   * avoiding binary floating point inaccuracies.
   */
  public static roundMoney(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  /**
   * Calculates billable days from duration applying grace period.
   * If the extra duration beyond full 24h days is <= gracePeriodMinutes, the extra day is not billed.
   */
  public static calculateBillableDays(
    pickup: Date,
    dropoff: Date,
    gracePeriodMinutes: number = 0
  ): { days: number; totalMinutes: number } {
    const diffMs = dropoff.getTime() - pickup.getTime();
    if (diffMs <= 0) {
      throw AppError.badRequest('Dropoff time must be strictly after pickup time');
    }

    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const fullDays = Math.floor(totalMinutes / (24 * 60));
    const remainderMinutes = totalMinutes % (24 * 60);

    let billableDays = fullDays;
    if (remainderMinutes > (gracePeriodMinutes || 0)) {
      billableDays += 1;
    }

    // Minimum billable is 1 day
    return { days: Math.max(1, billableDays), totalMinutes };
  }

  /**
   * Calculates billable hours applying increment (e.g. 30 or 60 min) and grace period.
   */
  public static calculateBillableHours(
    pickup: Date,
    dropoff: Date,
    billingIncrementMinutes: number = 60,
    gracePeriodMinutes: number = 0,
    minimumBillableHours: number = 1
  ): { billableHours: number; totalMinutes: number } {
    const diffMs = dropoff.getTime() - pickup.getTime();
    if (diffMs <= 0) {
      throw AppError.badRequest('Dropoff time must be strictly after pickup time');
    }

    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const increment = Math.max(15, billingIncrementMinutes || 60);
    const grace = Math.max(0, gracePeriodMinutes || 0);

    // Apply grace period before stepping into next increment
    const effectiveMinutes = Math.max(0, totalMinutes - grace);
    let incrementsCount = Math.ceil(effectiveMinutes / increment);
    if (incrementsCount === 0 && totalMinutes > 0) {
      incrementsCount = 1;
    }

    const hours = (incrementsCount * increment) / 60;
    return {
      billableHours: Math.max(minimumBillableHours || 1, hours),
      totalMinutes,
    };
  }

  /**
   * Calculates billable months and remainder days for monthly rental.
   */
  public static calculateMonthlyPeriods(
    pickup: Date,
    dropoff: Date,
    policy: string = 'prorated_daily'
  ): {
    fullMonths: number;
    remainderDays: number;
    totalDays: number;
    totalMonthsDecimal: number;
  } {
    const diffMs = dropoff.getTime() - pickup.getTime();
    if (diffMs <= 0) {
      throw AppError.badRequest('Dropoff time must be strictly after pickup time');
    }

    const totalDays = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

    let current = new Date(pickup);
    let fullMonths = 0;

    // Advance full calendar months
    while (true) {
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      if (nextMonth <= dropoff) {
        fullMonths += 1;
        current = nextMonth;
      } else {
        break;
      }
    }

    const remainingDiffMs = dropoff.getTime() - current.getTime();
    const remainderDays = Math.max(0, Math.ceil(remainingDiffMs / (24 * 60 * 60 * 1000)));

    let totalMonthsDecimal = fullMonths;
    if (policy === 'full_month' && remainderDays > 0) {
      totalMonthsDecimal = fullMonths + 1;
    } else {
      totalMonthsDecimal = fullMonths + remainderDays / 30;
    }

    return {
      fullMonths,
      remainderDays,
      totalDays,
      totalMonthsDecimal: RentalPricingService.roundMoney(totalMonthsDecimal),
    };
  }

  /**
   * Primary quote calculation engine.
   * Deterministic, server-authoritative, supporting all 5 pricing methods.
   */
  public static calculateQuote(req: QuoteCalculationRequest): CalculationQuoteResult {
    const { pricingConfig, estimatedKm } = req;
    const pickup = new Date(req.pickupDateTime);
    const dropoff = new Date(req.returnDateTime);

    if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
      throw AppError.badRequest('Invalid pickup or return date format');
    }

    if (pickup >= dropoff) {
      throw AppError.badRequest('Return date must be strictly after pickup date');
    }

    const currency = pricingConfig.currency || 'PKR';
    const method = pricingConfig.pricingMethod || 'daily';
    const taxRatePercent = Number(req.taxRatePercent ?? 8); // Default 8% tax
    const discountPercent = Math.max(0, Math.min(100, Number(req.discountPercent || 0)));
    const lineItems: PricingBreakdownLineItem[] = [];

    let baseRate = 0;
    let rateUnit = 'DAY';
    let baseRental = 0;
    let extraDistanceCharge = 0;
    let includedKm = 0;
    let extraKm = 0;

    let billableHours = 0;
    let billableDays = 0;
    let billableMonths = 0;
    let durationDesc = '';

    const gracePeriod = Number(pricingConfig.gracePeriodMinutes || 0);

    switch (method) {
      // ----------------------------------------------------
      // METHOD A: Daily rental
      // ----------------------------------------------------
      case 'daily': {
        const duration = this.calculateBillableDays(pickup, dropoff, gracePeriod);
        billableDays = duration.days;
        baseRate = Number(pricingConfig.dailyRate || 0);
        rateUnit = 'DAY';
        durationDesc = `${billableDays} day${billableDays > 1 ? 's' : ''}`;

        if (baseRate <= 0) {
          throw AppError.badRequest('Vehicle does not have a valid daily rate configured');
        }

        // Apply weekly discount if configured (7+ days)
        if (billableDays >= 7 && pricingConfig.weeklyRate && Number(pricingConfig.weeklyRate) > 0) {
          const dailyEq = Number(pricingConfig.weeklyRate) / 7;
          baseRate = dailyEq;
        }

        baseRental = this.roundMoney(billableDays * baseRate);

        lineItems.push({
          lineType: 'base_rental',
          description: `Daily rental (${billableDays} days @ ${currency} ${this.roundMoney(baseRate)}/day)`,
          quantity: billableDays,
          unit: 'DAY',
          unitPrice: this.roundMoney(baseRate),
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });

        // Optional excess mileage for daily rental if vehicle has mileage limit and fee
        const limitPerDay = Number(pricingConfig.mileageLimitPerDay || 0);
        const excessFee = Number(pricingConfig.excessMileageFee || 0);
        if (limitPerDay > 0 && excessFee > 0 && estimatedKm && estimatedKm > 0) {
          includedKm = billableDays * limitPerDay;
          if (estimatedKm > includedKm) {
            extraKm = estimatedKm - includedKm;
            extraDistanceCharge = this.roundMoney(extraKm * excessFee);
            lineItems.push({
              lineType: 'extra_km',
              description: `Estimated excess mileage (${extraKm} km @ ${currency} ${excessFee}/km)`,
              quantity: extraKm,
              unit: 'KM',
              unitPrice: excessFee,
              amount: extraDistanceCharge,
              currency,
              isTaxable: true,
              taxAmount: 0,
            });
          }
        }
        break;
      }

      // ----------------------------------------------------
      // METHOD B: Per-kilometer rental
      // ----------------------------------------------------
      case 'per_km': {
        const diffMs = dropoff.getTime() - pickup.getTime();
        billableHours = Math.ceil(diffMs / (60 * 60 * 1000));
        durationDesc = `${Math.ceil(billableHours / 24)} day(s) trip`;

        baseRate = Number(pricingConfig.perKmRate || 0);
        rateUnit = 'KM';

        if (baseRate <= 0) {
          throw AppError.badRequest('Vehicle does not have a valid per-km rate configured');
        }

        const distance = Math.max(0, Number(estimatedKm || 0));
        const minTrip = Number(pricingConfig.minimumTripCharge || 0);
        const rawCharge = this.roundMoney(distance * baseRate);
        baseRental = Math.max(rawCharge, minTrip);

        lineItems.push({
          lineType: 'base_rental',
          description:
            minTrip > 0 && rawCharge < minTrip
              ? `Per-km rental minimum charge (${distance} km @ ${currency} ${baseRate}/km; Min: ${currency} ${minTrip})`
              : `Per-km rental (${distance} km @ ${currency} ${baseRate}/km)`,
          quantity: distance,
          unit: 'KM',
          unitPrice: baseRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }

      // ----------------------------------------------------
      // METHOD C: Daily rental plus extra kilometers
      // ----------------------------------------------------
      case 'daily_extra_km': {
        const duration = this.calculateBillableDays(pickup, dropoff, gracePeriod);
        billableDays = duration.days;
        baseRate = Number(pricingConfig.dailyRate || 0);
        rateUnit = 'DAY';
        durationDesc = `${billableDays} day${billableDays > 1 ? 's' : ''}`;

        if (baseRate <= 0) {
          throw AppError.badRequest('Vehicle does not have a valid daily rate configured');
        }

        baseRental = this.roundMoney(billableDays * baseRate);
        lineItems.push({
          lineType: 'base_rental',
          description: `Daily base rental (${billableDays} days @ ${currency} ${baseRate}/day)`,
          quantity: billableDays,
          unit: 'DAY',
          unitPrice: baseRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });

        const kmPerDay = Number(pricingConfig.mileageLimitPerDay ?? 200);
        const excessRate = Number(pricingConfig.excessMileageFee ?? pricingConfig.perKmRate ?? 50);
        includedKm = billableDays * kmPerDay;

        if (estimatedKm && estimatedKm > includedKm) {
          extraKm = estimatedKm - includedKm;
          extraDistanceCharge = this.roundMoney(extraKm * excessRate);
          lineItems.push({
            lineType: 'extra_km',
            description: `Estimated excess distance (${extraKm} extra km @ ${currency} ${excessRate}/km; Included: ${includedKm} km)`,
            quantity: extraKm,
            unit: 'KM',
            unitPrice: excessRate,
            amount: extraDistanceCharge,
            currency,
            isTaxable: true,
            taxAmount: 0,
          });
        }
        break;
      }

      // ----------------------------------------------------
      // METHOD D: Hourly rental
      // ----------------------------------------------------
      case 'hourly': {
        const increment = Number(pricingConfig.billingIncrementMinutes || 60);
        const minHours = Number(pricingConfig.minimumBillableHours || 1);
        const duration = this.calculateBillableHours(pickup, dropoff, increment, gracePeriod, minHours);

        billableHours = duration.billableHours;
        baseRate = Number(pricingConfig.hourlyRate || 0);
        rateUnit = 'HOUR';
        durationDesc = `${billableHours} hour${billableHours > 1 ? 's' : ''} (increment ${increment}m)`;

        if (baseRate <= 0) {
          throw AppError.badRequest('Vehicle does not have a valid hourly rate configured');
        }

        baseRental = this.roundMoney(billableHours * baseRate);
        lineItems.push({
          lineType: 'base_rental',
          description: `Hourly rental (${billableHours} hrs @ ${currency} ${baseRate}/hr)`,
          quantity: billableHours,
          unit: 'HOUR',
          unitPrice: baseRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }

      // ----------------------------------------------------
      // METHOD E: Monthly rental
      // ----------------------------------------------------
      case 'monthly': {
        const policy = pricingConfig.partialMonthPolicy || 'prorated_daily';
        const periods = this.calculateMonthlyPeriods(pickup, dropoff, policy);
        billableMonths = periods.totalMonthsDecimal;
        baseRate = Number(pricingConfig.monthlyRate || 0);
        rateUnit = 'MONTH';
        durationDesc = `${periods.fullMonths} month(s), ${periods.remainderDays} remainder day(s)`;

        if (baseRate <= 0) {
          throw AppError.badRequest('Vehicle does not have a valid monthly rate configured');
        }

        let fullMonthCharge = this.roundMoney(periods.fullMonths * baseRate);
        let remainderCharge = 0;

        if (periods.remainderDays > 0) {
          if (policy === 'full_month') {
            fullMonthCharge = this.roundMoney((periods.fullMonths + 1) * baseRate);
          } else {
            // Prorated daily based on 30-day month
            const dailyEquiv = baseRate / 30;
            remainderCharge = this.roundMoney(periods.remainderDays * dailyEquiv);
          }
        }

        baseRental = this.roundMoney(fullMonthCharge + remainderCharge);
        lineItems.push({
          lineType: 'base_rental',
          description: `Monthly rental (${periods.fullMonths} mos @ ${currency} ${baseRate} + ${periods.remainderDays} days prorated)`,
          quantity: billableMonths,
          unit: 'MONTH',
          unitPrice: baseRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }

      default:
        throw AppError.badRequest(`Unsupported pricing method: ${method}`);
    }

    // Driver fee (if selected)
    let driverFee = 0;
    if (req.driverRequired) {
      const dailyDriverFee = Number(req.driverFeePerDay || 2500); // PKR 2500/day
      const effectiveDays = Math.max(1, billableDays || Math.ceil(billableHours / 24) || 1);
      driverFee = this.roundMoney(effectiveDays * dailyDriverFee);
      lineItems.push({
        lineType: 'driver_fee',
        description: `Professional Chauffeur service (${effectiveDays} days @ ${currency} ${dailyDriverFee}/day)`,
        quantity: effectiveDays,
        unit: 'DAY',
        unitPrice: dailyDriverFee,
        amount: driverFee,
        currency,
        isTaxable: true,
        taxAmount: 0,
      });
    }

    // Subtotal before discounts
    const subtotal = this.roundMoney(baseRental + extraDistanceCharge + driverFee);

    // Discounts
    let discountAmount = 0;
    if (discountPercent > 0) {
      discountAmount = this.roundMoney((subtotal * discountPercent) / 100);
      lineItems.push({
        lineType: 'discount',
        description: `Promotional discount (${discountPercent}%)`,
        quantity: 1,
        unit: 'PERCENT',
        unitPrice: discountAmount,
        amount: -discountAmount,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    const taxableAmount = Math.max(0, this.roundMoney(subtotal - discountAmount));
    const taxAmount = this.roundMoney((taxableAmount * taxRatePercent) / 100);

    if (taxAmount > 0) {
      lineItems.push({
        lineType: 'tax',
        description: `Sales Tax / GST (${taxRatePercent}%)`,
        quantity: 1,
        unit: 'PERCENT',
        unitPrice: taxAmount,
        amount: taxAmount,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    const rentalTotal = this.roundMoney(taxableAmount + taxAmount);

    // Refundable Security Deposit (Separated from rental revenue!)
    const securityDeposit = this.roundMoney(Number(pricingConfig.securityDeposit || 0));
    if (securityDeposit > 0) {
      lineItems.push({
        lineType: 'deposit',
        description: `Refundable Security Deposit (reimbursed upon safe return)`,
        quantity: 1,
        unit: 'DEPOSIT',
        unitPrice: securityDeposit,
        amount: securityDeposit,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    const grandTotal = this.roundMoney(rentalTotal + securityDeposit);

    return {
      pricingMethod: method,
      currency,
      billableDuration: {
        hours: billableHours,
        days: billableDays,
        months: billableMonths,
        description: durationDesc,
      },
      billableDistance: {
        estimatedKm: estimatedKm || 0,
        includedKm,
        extraKm,
      },
      ratesApplied: {
        baseRate,
        rateUnit,
        minimumTripCharge: Number(pricingConfig.minimumTripCharge || 0),
        extraKmRate: Number(pricingConfig.excessMileageFee ?? pricingConfig.perKmRate ?? 0),
      },
      subtotal,
      extraDistanceCharge,
      driverFee,
      discountAmount,
      taxableAmount,
      taxAmount,
      rentalTotal,
      securityDeposit,
      grandTotal,
      lineItems,
      pricingEngineVersion: this.VERSION,
    };
  }

  /**
   * Final return and settlement calculation using immutable snapshot.
   * Compares actual return time against agreed time (with grace period) and actual odometer against limits.
   */
  public static calculateSettlement(req: SettlementCalculationRequest): SettlementResult {
    const { snapshot } = req;
    const currency = snapshot.currency || 'PKR';
    const method = snapshot.pricingMethod || 'daily';

    const agreedPickup = new Date(req.agreedPickupDateTime);
    const agreedReturn = new Date(req.agreedReturnDateTime);
    const actualPickup = new Date(req.actualPickupDateTime);
    const actualReturn = new Date(req.actualReturnDateTime);

    if (req.endOdometer < req.startOdometer) {
      throw AppError.badRequest(
        `Ending odometer (${req.endOdometer}) cannot be lower than starting odometer (${req.startOdometer})`
      );
    }

    const actualDistance = Math.max(0, req.endOdometer - req.startOdometer);
    const gracePeriod = Number(snapshot.gracePeriodMinutes || 0);

    // 1. Duration & Late Return analysis
    const agreedMs = agreedReturn.getTime() - agreedPickup.getTime();
    const actualMs = actualReturn.getTime() - actualPickup.getTime();
    const agreedHours = this.roundMoney(agreedMs / (1000 * 60 * 60));
    const actualHours = this.roundMoney(actualMs / (1000 * 60 * 60));

    // Late return calculation: delay beyond agreedReturn + gracePeriod
    const overdueMs = actualReturn.getTime() - agreedReturn.getTime();
    const overdueMinutes = Math.floor(overdueMs / (60 * 1000));
    let lateHours = 0;
    let lateFee = 0;

    if (overdueMinutes > gracePeriod) {
      // Billed in hourly increments based on vehicle daily rate / 24 * 1.5 multiplier, or explicit hourly rate
      const lateIncrement = snapshot.billingIncrementMinutes || 60;
      lateHours = Math.ceil((overdueMinutes - gracePeriod) / lateIncrement) * (lateIncrement / 60);

      const baseHourly =
        snapshot.hourlyRate && Number(snapshot.hourlyRate) > 0
          ? Number(snapshot.hourlyRate)
          : (Number(snapshot.dailyRate || 8000) / 24) * 1.5;

      lateFee = this.roundMoney(lateHours * baseHourly);
    }

    // 2. Base Rental and Mileage calculation based on agreed snapshot
    let baseRental = 0;
    let includedKm = 0;
    let extraKm = 0;
    let extraKmRate = Number(snapshot.excessMileageRate || snapshot.perKmRate || 0);
    let extraKmCharge = 0;

    const lineItems: PricingBreakdownLineItem[] = [];

    switch (method) {
      case 'daily': {
        const days = Math.max(1, Math.ceil(agreedMs / (24 * 60 * 60 * 1000)));
        const dailyRate = Number(snapshot.dailyRate || 0);
        baseRental = this.roundMoney(days * dailyRate);

        lineItems.push({
          lineType: 'base_rental',
          description: `Contracted daily base rental (${days} days @ ${currency} ${dailyRate})`,
          quantity: days,
          unit: 'DAY',
          unitPrice: dailyRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });

        if (snapshot.includedKmPerDay && snapshot.includedKmPerDay > 0 && extraKmRate > 0) {
          includedKm = days * snapshot.includedKmPerDay;
          if (actualDistance > includedKm) {
            extraKm = actualDistance - includedKm;
            extraKmCharge = this.roundMoney(extraKm * extraKmRate);
            lineItems.push({
              lineType: 'extra_km',
              description: `Verified excess distance (${extraKm} km @ ${currency} ${extraKmRate}/km)`,
              quantity: extraKm,
              unit: 'KM',
              unitPrice: extraKmRate,
              amount: extraKmCharge,
              currency,
              isTaxable: true,
              taxAmount: 0,
            });
          }
        }
        break;
      }

      case 'per_km': {
        const perKmRate = Number(snapshot.perKmRate || 0);
        extraKmRate = perKmRate;
        const minTrip = Number(snapshot.minimumTripCharge || 0);
        const distanceCharge = this.roundMoney(actualDistance * perKmRate);
        baseRental = Math.max(distanceCharge, minTrip);

        lineItems.push({
          lineType: 'base_rental',
          description: `Verified per-km trip charge (${actualDistance} km @ ${currency} ${perKmRate}/km; Min: ${currency} ${minTrip})`,
          quantity: actualDistance,
          unit: 'KM',
          unitPrice: perKmRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }

      case 'daily_extra_km': {
        const days = Math.max(1, Math.ceil(agreedMs / (24 * 60 * 60 * 1000)));
        const dailyRate = Number(snapshot.dailyRate || 0);
        baseRental = this.roundMoney(days * dailyRate);

        lineItems.push({
          lineType: 'base_rental',
          description: `Contracted daily base rental (${days} days @ ${currency} ${dailyRate})`,
          quantity: days,
          unit: 'DAY',
          unitPrice: dailyRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });

        includedKm = days * (snapshot.includedKmPerDay || 200);
        if (actualDistance > includedKm) {
          extraKm = actualDistance - includedKm;
          extraKmCharge = this.roundMoney(extraKm * extraKmRate);
          lineItems.push({
            lineType: 'extra_km',
            description: `Verified excess mileage (${extraKm} km @ ${currency} ${extraKmRate}/km; Allowance: ${includedKm} km)`,
            quantity: extraKm,
            unit: 'KM',
            unitPrice: extraKmRate,
            amount: extraKmCharge,
            currency,
            isTaxable: true,
            taxAmount: 0,
          });
        }
        break;
      }

      case 'hourly': {
        const hours = Math.max(1, Math.ceil(agreedMs / (60 * 60 * 1000)));
        const hourlyRate = Number(snapshot.hourlyRate || 0);
        baseRental = this.roundMoney(hours * hourlyRate);

        lineItems.push({
          lineType: 'base_rental',
          description: `Contracted hourly rental (${hours} hrs @ ${currency} ${hourlyRate}/hr)`,
          quantity: hours,
          unit: 'HOUR',
          unitPrice: hourlyRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }

      case 'monthly': {
        const monthlyRate = Number(snapshot.monthlyRate || 0);
        const periods = this.calculateMonthlyPeriods(agreedPickup, agreedReturn, snapshot.partialMonthPolicy || 'prorated_daily');
        baseRental = this.roundMoney(periods.totalMonthsDecimal * monthlyRate);

        lineItems.push({
          lineType: 'base_rental',
          description: `Contracted monthly rental (${periods.fullMonths} mos + ${periods.remainderDays} days)`,
          quantity: periods.totalMonthsDecimal,
          unit: 'MONTH',
          unitPrice: monthlyRate,
          amount: baseRental,
          currency,
          isTaxable: true,
          taxAmount: 0,
        });
        break;
      }
    }

    // Add Late Return Line Item
    if (lateFee > 0) {
      lineItems.push({
        lineType: 'late_return',
        description: `Late vehicle return penalty (${lateHours} overdue hours)`,
        quantity: lateHours,
        unit: 'HOUR',
        unitPrice: this.roundMoney(lateFee / lateHours),
        amount: lateFee,
        currency,
        isTaxable: true,
        taxAmount: 0,
      });
    }

    // 3. Operational Extra Charges (Damage, Fuel, Adjustment)
    const damageCharge = this.roundMoney(Number(req.damageCharge || 0));
    if (damageCharge > 0) {
      lineItems.push({
        lineType: 'damage_charge',
        description: `Assessed vehicle damage repairs`,
        quantity: 1,
        unit: 'DAMAGE',
        unitPrice: damageCharge,
        amount: damageCharge,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    const fuelCharge = this.roundMoney(Number(req.fuelDiscrepancyCharge || 0));
    if (fuelCharge > 0) {
      lineItems.push({
        lineType: 'fuel',
        description: `Fuel level deficit refueling surcharge`,
        quantity: 1,
        unit: 'FUEL',
        unitPrice: fuelCharge,
        amount: fuelCharge,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    const manualAdjustment = this.roundMoney(Number(req.additionalAdjustment || 0));
    if (manualAdjustment !== 0) {
      lineItems.push({
        lineType: 'manual_adjustment',
        description: `Authorized operational adjustment`,
        quantity: 1,
        unit: 'ADJUSTMENT',
        unitPrice: manualAdjustment,
        amount: manualAdjustment,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    // Taxes
    const taxRatePercent = Number(snapshot.taxRatePercent ?? 8);
    const taxableSubtotal = this.roundMoney(baseRental + extraKmCharge + lateFee);
    const taxAmount = this.roundMoney((taxableSubtotal * taxRatePercent) / 100);

    if (taxAmount > 0) {
      lineItems.push({
        lineType: 'tax',
        description: `Sales Tax / GST (${taxRatePercent}%)`,
        quantity: 1,
        unit: 'PERCENT',
        unitPrice: taxAmount,
        amount: taxAmount,
        currency,
        isTaxable: false,
        taxAmount: 0,
      });
    }

    // Final rental total
    const finalRentalTotal = this.roundMoney(
      taxableSubtotal + taxAmount + damageCharge + fuelCharge + manualAdjustment
    );

    // Deposit Accounting
    const originalDeposit = this.roundMoney(Number(snapshot.depositAmount || 0));
    // Deductions from deposit if applicable
    const deductions = this.roundMoney(Math.min(originalDeposit, damageCharge + fuelCharge));
    const refundableDeposit = this.roundMoney(Math.max(0, originalDeposit - deductions));

    // Financial Reconciliation
    // Total gross billed to customer (rental + charges + held deposit)
    const amountAlreadyPaid = this.roundMoney(Number(req.amountAlreadyPaid || 0));

    // Net payable or refund:
    // If the customer already paid the rental total + deposit upfront, then any extra settlement charges
    // can be offset against the deposit.
    // Net balance = finalRentalTotal + originalDeposit - amountAlreadyPaid - refundableDeposit
    // = finalRentalTotal - amountAlreadyPaid + deductions
    const netPayableOrRefund = this.roundMoney(finalRentalTotal - amountAlreadyPaid);

    return {
      pricingMethod: method,
      currency,
      odometer: {
        startOdometer: req.startOdometer,
        endOdometer: req.endOdometer,
        actualDistanceTraveled: actualDistance,
        includedKm,
        extraKm,
        extraKmRate,
        extraKmCharge,
      },
      duration: {
        agreedHours,
        actualHours,
        gracePeriodMinutes: gracePeriod,
        lateHours,
        lateFee,
      },
      breakdown: {
        baseRental,
        extraKmCharge,
        lateFee,
        damageCharge,
        fuelCharge,
        manualAdjustment,
        taxAmount,
        finalRentalTotal,
      },
      depositAccounting: {
        originalDeposit,
        deductions,
        refundableDeposit,
      },
      financialSummary: {
        totalBilled: finalRentalTotal,
        amountAlreadyPaid,
        netPayableOrRefund,
        isRefundDue: netPayableOrRefund < 0,
      },
      lineItems,
    };
  }
}
