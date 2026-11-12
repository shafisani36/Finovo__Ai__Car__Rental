import assert from 'assert';
import { RentalPricingService } from '../../src/modules/fleet/rental-pricing.service';
import {
  blockingBookingWhere,
  BOOKING_ADDON_CATALOG,
  TURNAROUND_BUFFER_MS,
  AWAITING_PAYMENT_STATUS,
} from '../../src/modules/bookings/booking.service';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(` [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err.message || err);
    failed++;
  }
}

/** In-memory evaluation of the overlap rule produced by blockingBookingWhere */
function blocks(
  booking: { status: string; pickup: string; ret: string; settlementStatus?: string | null; createdAt?: Date },
  from: string,
  to: string
) {
  const where: any = blockingBookingWhere(new Date(from), new Date(to));
  const pickup = new Date(booking.pickup);
  const ret = new Date(booking.ret);
  const createdAt = booking.createdAt || new Date();
  const statusOk = where.status.in.includes(booking.status);
  const overlap = pickup < where.pickupDateTime.lt && ret > where.returnDateTime.gt;
  const holdOk =
    booking.settlementStatus == null ||
    booking.settlementStatus !== AWAITING_PAYMENT_STATUS ||
    createdAt >= where.OR[2].createdAt.gte;
  return statusOk && overlap && holdOk;
}

const booked = { status: 'CONFIRMED', pickup: '2026-11-05T10:00:00Z', ret: '2026-11-06T10:00:00Z' };

test('Car booked 5-6 Nov is hidden for a 5-6 Nov search', () => {
  assert.strictEqual(blocks(booked, '2026-11-05T00:00:00Z', '2026-11-06T23:59:59Z'), true);
});
test('Car booked 5-6 Nov is hidden for a range touching 5 Nov (4-5 Nov)', () => {
  assert.strictEqual(blocks(booked, '2026-11-04T00:00:00Z', '2026-11-05T23:59:59Z'), true);
});
test('Car booked 5-6 Nov is shown for 8-9 Nov', () => {
  assert.strictEqual(blocks(booked, '2026-11-08T00:00:00Z', '2026-11-09T23:59:59Z'), false);
});
test('Car booked 5-6 Nov is shown for 1-3 Nov', () => {
  assert.strictEqual(blocks(booked, '2026-11-01T00:00:00Z', '2026-11-03T23:59:59Z'), false);
});
test('Turnaround buffer blocks a pickup 1 hour after return', () => {
  assert.strictEqual(TURNAROUND_BUFFER_MS, 2 * 60 * 60 * 1000);
  assert.strictEqual(blocks(booked, '2026-11-06T11:00:00Z', '2026-11-07T11:00:00Z'), true);
});
test('Cancelled / completed bookings never block', () => {
  assert.strictEqual(blocks({ ...booked, status: 'CANCELLED' }, '2026-11-05T00:00:00Z', '2026-11-06T23:59:59Z'), false);
  assert.strictEqual(blocks({ ...booked, status: 'COMPLETED' }, '2026-11-05T00:00:00Z', '2026-11-06T23:59:59Z'), false);
});
test('Unpaid online booking stops blocking after the payment hold expires', () => {
  const unpaid = { ...booked, status: 'PENDING', settlementStatus: AWAITING_PAYMENT_STATUS };
  assert.strictEqual(blocks({ ...unpaid, createdAt: new Date() }, '2026-11-05T00:00:00Z', '2026-11-06T23:59:59Z'), true);
  assert.strictEqual(
    blocks({ ...unpaid, createdAt: new Date(Date.now() - 31 * 60 * 1000) }, '2026-11-05T00:00:00Z', '2026-11-06T23:59:59Z'),
    false
  );
});
test('Add-ons are priced server-side per day and taxed', () => {
  const quote = RentalPricingService.calculateQuote({
    pricingConfig: { pricingMethod: 'daily', currency: 'PKR', dailyRate: 8000, securityDeposit: 5000 },
    pickupDateTime: new Date('2026-11-01T10:00:00Z'),
    returnDateTime: new Date('2026-11-04T10:00:00Z'),
    taxRatePercent: 8,
    addons: [BOOKING_ADDON_CATALOG.PROTECTION_PREMIUM, BOOKING_ADDON_CATALOG.GPS],
  });
  assert.strictEqual(quote.addonsTotal, (75 + 10) * 3);
  assert.strictEqual(quote.subtotal, 24000 + 255);
  assert.strictEqual(quote.taxAmount, Math.round(24255 * 0.08 * 100) / 100);
  assert.strictEqual(quote.rentalTotal, Math.round((24255 + quote.taxAmount) * 100) / 100);
  assert.strictEqual(quote.grandTotal, quote.rentalTotal + 5000);
});

console.log(`\nBooking availability & add-on tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
