import { RentalPricingService } from '../../src/modules/fleet/rental-pricing.service';
import { cancellationTerms, FREE_CANCELLATION_HOURS } from '../../src/modules/bookings/cancellation-policy';
import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service';
import { normalizeReferralCode, REFERRAL_CODE_PATTERN } from '../../src/modules/loyalty/referral.service';

/** Tests for the money rules of promo codes, reward points, delivery fees and cancellations. */
async function runOfferTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(` [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(` [FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  function expectEqual(actual: unknown, expected: unknown, label: string) {
    if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }

  const pickup = new Date('2026-12-01T10:00:00Z');
  const dropoff = new Date('2026-12-04T10:00:00Z'); // 3 days
  const baseRequest = {
    pricingConfig: { pricingMethod: 'daily' as const, dailyRate: 155, currency: 'SAR', securityDeposit: 0 },
    pickupDateTime: pickup,
    returnDateTime: dropoff,
    taxRatePercent: 8,
  };

  test('Delivery fee is added to the subtotal and taxed', () => {
    const quote = RentalPricingService.calculateQuote({ ...baseRequest, deliveryFee: 75 });
    expectEqual(quote.subtotal, 540, 'subtotal (465 + 75)');
    expectEqual(quote.taxAmount, 43.2, 'tax (8% of 540)');
    expectEqual(quote.deliveryFee, 75, 'delivery fee');
  });

  test('Fixed discounts are taken off before tax', () => {
    const quote = RentalPricingService.calculateQuote({
      ...baseRequest,
      fixedDiscounts: [
        { description: 'Promo code WELCOME10', amount: 46.5 },
        { description: 'Reward points (100)', amount: 10 },
      ],
    });
    // 465 - 46.5 - 10 = 408.5 taxable, 8% tax = 32.68
    expectEqual(quote.taxAmount, 32.68, 'tax after discounts');
    expectEqual(quote.rentalTotal, 441.18, 'rental total after discounts');
  });

  test('Discounts can never make the rental negative', () => {
    const quote = RentalPricingService.calculateQuote({
      ...baseRequest,
      fixedDiscounts: [{ description: 'Promo code HUGE', amount: 10_000 }],
    });
    expectEqual(quote.taxAmount, 0, 'tax');
    expectEqual(quote.rentalTotal, 0, 'rental total');
  });

  test('Cancelling early is free and refunds everything paid', () => {
    const now = new Date(pickup.getTime() - (FREE_CANCELLATION_HOURS + 1) * 3_600_000);
    const terms = cancellationTerms({ pickupDateTime: pickup, totalAmount: 600, totalDays: 3 }, 600, now);
    expectEqual(terms.isFree, true, 'isFree');
    expectEqual(terms.fee, 0, 'fee');
    expectEqual(terms.refund, 600, 'refund');
  });

  test('Cancelling late keeps one day of the rental', () => {
    const now = new Date(pickup.getTime() - 2 * 3_600_000);
    const terms = cancellationTerms({ pickupDateTime: pickup, totalAmount: 600, totalDays: 3 }, 1100, now);
    expectEqual(terms.isFree, false, 'isFree');
    expectEqual(terms.fee, 200, 'fee (one day)');
    expectEqual(terms.refund, 900, 'refund (paid minus fee)');
  });

  test('The late fee is never more than what was paid', () => {
    const now = new Date(pickup.getTime() - 3_600_000);
    const terms = cancellationTerms({ pickupDateTime: pickup, totalAmount: 600, totalDays: 3 }, 50, now);
    expectEqual(terms.fee, 50, 'fee');
    expectEqual(terms.refund, 0, 'refund');
  });

  test('Points are limited by the balance and by half of the rental', () => {
    // 10 points = 1 currency unit; half of 465 = 232.5 => at most 2325 points
    const byShare = LoyaltyService.pointsDiscount(5000, 10_000, 465);
    expectEqual(byShare.maxUsable, 2325, 'max by share');
    expectEqual(byShare.points, 2325, 'points used');
    expectEqual(byShare.amount, 232.5, 'discount');
    const byBalance = LoyaltyService.pointsDiscount(500, 372, 465);
    expectEqual(byBalance.points, 372, 'points limited by balance');
    expectEqual(byBalance.amount, 37.2, 'discount from balance');
  });

  test('Tiers follow the points earned', () => {
    expectEqual(LoyaltyService.tierFor(0).tier, 'Silver', 'tier at 0');
    expectEqual(LoyaltyService.tierFor(500).tier, 'Gold', 'tier at 500');
    expectEqual(LoyaltyService.tierFor(2500).tier, 'Platinum', 'tier at 2500');
    expectEqual(LoyaltyService.tierFor(372).pointsToNextTier, 128, 'points to Gold');
  });

  test('Invite codes are read the same way however they are typed', () => {
    expectEqual(normalizeReferralCode(' fin7k3-qx9 '), 'FIN7K3QX9', 'normalized code');
    expectEqual(REFERRAL_CODE_PATTERN.test('FIN7K3QX9'), true, 'valid code');
  });

  test('Invite codes with look-alike or missing characters are refused', () => {
    expectEqual(REFERRAL_CODE_PATTERN.test('FIN0O1IL2'), false, 'look-alike letters');
    expectEqual(REFERRAL_CODE_PATTERN.test('FIN7K3QX'), false, 'too short');
    expectEqual(REFERRAL_CODE_PATTERN.test('ABC7K3QX9'), false, 'wrong prefix');
    expectEqual(REFERRAL_CODE_PATTERN.test("FIN7K3' OR"), false, 'injection text');
  });

  console.log(`\nOffer and cancellation tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runOfferTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
