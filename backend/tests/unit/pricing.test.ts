import { RentalPricingService } from '../../src/modules/fleet/rental-pricing.service';

async function runPricingTests() {
  console.log('\n======================================================');
  console.log('   RUNNING FINOVO ENTERPRISE PRICING ENGINE TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(` [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  // ------------------------------------------------------------------------
  // METHOD A: Daily rental
  // Example A from prompt: Rate: PKR 8,000/day. Billable duration: 3 days. Base: PKR 24,000.
  // ------------------------------------------------------------------------
  test('Method A (Daily): Calculates 3 days @ PKR 8,000 correctly', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-04T10:00:00Z'); // exactly 3 days (72h)

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'daily',
        dailyRate: 8000,
        currency: 'PKR',
        securityDeposit: 20000,
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      taxRatePercent: 0,
    });

    if (quote.subtotal !== 24000) throw new Error(`Expected subtotal 24000, got ${quote.subtotal}`);
    if (quote.securityDeposit !== 20000) throw new Error(`Expected deposit 20000, got ${quote.securityDeposit}`);
    if (quote.grandTotal !== 44000) throw new Error(`Expected grandTotal 44000, got ${quote.grandTotal}`);
  });

  // Grace period test: 3 days + 45 minutes with 60-min grace period => 3 days billed!
  test('Method A (Daily): Applies grace period without extra day charge', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-04T10:45:00Z'); // 3 days + 45 min

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'daily',
        dailyRate: 8000,
        gracePeriodMinutes: 60,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      taxRatePercent: 0,
    });

    if (quote.billableDuration.days !== 3) {
      throw new Error(`Expected 3 days due to 60m grace period, got ${quote.billableDuration.days}`);
    }
    if (quote.subtotal !== 24000) throw new Error(`Expected subtotal 24000, got ${quote.subtotal}`);
  });

  // Grace period exceeded: 3 days + 65 minutes with 60-min grace period => 4 days billed
  test('Method A (Daily): Overstay exceeding grace period advances billable days', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-04T11:05:00Z'); // 3 days + 65 min (>60)

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'daily',
        dailyRate: 8000,
        gracePeriodMinutes: 60,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      taxRatePercent: 0,
    });

    if (quote.billableDuration.days !== 4) {
      throw new Error(`Expected 4 days, got ${quote.billableDuration.days}`);
    }
    if (quote.subtotal !== 32000) throw new Error(`Expected subtotal 32000, got ${quote.subtotal}`);
  });

  // ------------------------------------------------------------------------
  // METHOD B: Per-kilometer rental
  // Example B from prompt: Rate: PKR 60/km, 150 km, Min trip: PKR 5,000 => PKR 9,000.
  // ------------------------------------------------------------------------
  test('Method B (Per-KM): Exceeds minimum trip charge', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-01T18:00:00Z');

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'per_km',
        perKmRate: 60,
        minimumTripCharge: 5000,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      estimatedKm: 150,
      taxRatePercent: 0,
    });

    if (quote.subtotal !== 9000) throw new Error(`Expected subtotal 9000, got ${quote.subtotal}`);
  });

  test('Method B (Per-KM): Applies minimum trip charge when distance charge is below minimum', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-01T14:00:00Z');

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'per_km',
        perKmRate: 60,
        minimumTripCharge: 5000,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      estimatedKm: 50, // 50 * 60 = 3000 < 5000 min
      taxRatePercent: 0,
    });

    if (quote.subtotal !== 5000) throw new Error(`Expected minimum charge 5000, got ${quote.subtotal}`);
  });

  // ------------------------------------------------------------------------
  // METHOD C: Daily rental plus extra mileage
  // Example C from prompt: Daily rate: PKR 8,000, Included: 200 km/day, Excess: PKR 50/km.
  // 3 days, 700 km.
  // Included = 600 km, Extra = 100 km @ 50 = PKR 5,000.
  // Base = 24,000. Subtotal = 29,000.
  // ------------------------------------------------------------------------
  test('Method C (Daily + Extra KM): Base + excess mileage calculation', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-04T10:00:00Z'); // 3 days

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'daily_extra_km',
        dailyRate: 8000,
        mileageLimitPerDay: 200,
        excessMileageFee: 50,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      estimatedKm: 700,
      taxRatePercent: 0,
    });

    if (quote.subtotal !== 29000) throw new Error(`Expected subtotal 29000, got ${quote.subtotal}`);
    if (quote.extraDistanceCharge !== 5000) throw new Error(`Expected extra km charge 5000, got ${quote.extraDistanceCharge}`);
    if (quote.billableDistance.includedKm !== 600) throw new Error(`Expected included 600 km, got ${quote.billableDistance.includedKm}`);
    if (quote.billableDistance.extraKm !== 100) throw new Error(`Expected extra 100 km, got ${quote.billableDistance.extraKm}`);
  });

  // ------------------------------------------------------------------------
  // METHOD D: Hourly rental
  // ------------------------------------------------------------------------
  test('Method D (Hourly): Hourly rate with minimum billable hours and increments', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-01T13:30:00Z'); // 3.5 hours

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'hourly',
        hourlyRate: 1500,
        billingIncrementMinutes: 30,
        minimumBillableHours: 2,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      taxRatePercent: 0,
    });

    if (quote.billableDuration.hours !== 3.5) {
      throw new Error(`Expected 3.5 hours, got ${quote.billableDuration.hours}`);
    }
    if (quote.subtotal !== 5250) throw new Error(`Expected subtotal 5250 (3.5 * 1500), got ${quote.subtotal}`);
  });

  // ------------------------------------------------------------------------
  // METHOD E: Monthly rental
  // ------------------------------------------------------------------------
  test('Method E (Monthly): Monthly rate with proration', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-12-16T10:00:00Z'); // 1 full month + 15 remainder days

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'monthly',
        monthlyRate: 150000,
        partialMonthPolicy: 'prorated_daily',
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      taxRatePercent: 0,
    });

    // 150,000 + (150,000 / 30) * 15 = 150,000 + 75,000 = 225,000
    if (quote.subtotal !== 225000) {
      throw new Error(`Expected subtotal 225000, got ${quote.subtotal}`);
    }
  });

  // ------------------------------------------------------------------------
  // TAXES, DISCOUNTS & DEPOSITS SEPARATION
  // ------------------------------------------------------------------------
  test('Tax, discount, and deposit are correctly computed and segregated', () => {
    const pickup = new Date('2026-11-01T10:00:00Z');
    const dropoff = new Date('2026-11-03T10:00:00Z'); // 2 days @ 10,000 = 20,000

    const quote = RentalPricingService.calculateQuote({
      pricingConfig: {
        pricingMethod: 'daily',
        dailyRate: 10000,
        securityDeposit: 30000,
        currency: 'PKR',
      },
      pickupDateTime: pickup,
      returnDateTime: dropoff,
      discountPercent: 10, // 10% off 20,000 = 2,000 off -> 18,000 taxable
      taxRatePercent: 5,   // 5% of 18,000 = 900
    });

    if (quote.subtotal !== 20000) throw new Error(`Subtotal mismatch`);
    if (quote.discountAmount !== 2000) throw new Error(`Discount mismatch`);
    if (quote.taxableAmount !== 18000) throw new Error(`Taxable mismatch`);
    if (quote.taxAmount !== 900) throw new Error(`Tax mismatch`);
    if (quote.rentalTotal !== 18900) throw new Error(`Rental total mismatch`);
    if (quote.securityDeposit !== 30000) throw new Error(`Deposit mismatch`);
    if (quote.grandTotal !== 48900) throw new Error(`Grand total mismatch (should be 18900 + 30000)`);
  });

  // ------------------------------------------------------------------------
  // FINAL SETTLEMENT (RETURN) WITH VERIFIED ODOMETER & LATE RETURN
  // ------------------------------------------------------------------------
  test('Final settlement: Computes verified extra km, late return fee, and damages', () => {
    const agreedPickup = '2026-11-01T10:00:00Z';
    const agreedReturn = '2026-11-04T10:00:00Z'; // 3 days
    const actualPickup = '2026-11-01T10:00:00Z';
    const actualReturn = '2026-11-04T14:30:00Z'; // 4.5 hours late

    const settlement = RentalPricingService.calculateSettlement({
      snapshot: {
        pricingMethod: 'daily_extra_km',
        currency: 'PKR',
        dailyRate: 8000,
        excessMileageRate: 50,
        includedKmPerDay: 200, // 3 days * 200 = 600 km allowance
        gracePeriodMinutes: 30,
        depositAmount: 25000,
        taxRatePercent: 0,
      },
      agreedPickupDateTime: agreedPickup,
      agreedReturnDateTime: agreedReturn,
      actualPickupDateTime: actualPickup,
      actualReturnDateTime: actualReturn,
      startOdometer: 12000,
      endOdometer: 12750, // 750 km traveled (150 km excess @ 50 = 7,500)
      damageCharge: 3000,
      fuelDiscrepancyCharge: 2000,
      amountAlreadyPaid: 24000, // Paid agreed base rental
    });

    if (settlement.odometer.actualDistanceTraveled !== 750) throw new Error('Distance traveled mismatch');
    if (settlement.odometer.extraKm !== 150) throw new Error('Extra km mismatch');
    if (settlement.odometer.extraKmCharge !== 7500) throw new Error('Extra km charge mismatch');
    if (settlement.duration.lateHours <= 0) throw new Error('Late hours should be > 0');
    if (settlement.depositAccounting.deductions !== 5000) throw new Error('Deductions should be 3000 + 2000 = 5000');
    if (settlement.depositAccounting.refundableDeposit !== 20000) throw new Error('Refundable deposit should be 20000');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runPricingTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
