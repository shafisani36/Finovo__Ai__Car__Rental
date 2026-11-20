/**
 * Cancellation policy, shared by the checkout, the customer portal and staff tools:
 * - Cancel at least FREE_CANCELLATION_HOURS before pickup: everything paid is refunded.
 * - Cancel later than that: one day of the rental is kept as a fee; the rest, and the deposit, are refunded.
 * - While the booking still waits for staff approval it is not confirmed yet, so cancelling is always free.
 * - Once the car has been handed over, the booking can no longer be cancelled online.
 */
export const FREE_CANCELLATION_HOURS = 24;

/** Booking statuses a customer can still cancel. */
export const CUSTOMER_CANCELLABLE_STATUSES = ['DRAFT', 'QUOTED', 'PENDING', 'RESERVED', 'CONFIRMED', 'READY_FOR_PICKUP', 'REQUIRES_REVIEW'];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CancellationTerms {
  isFree: boolean;
  freeUntil: Date;
  /** Kept by the company: one day of the rental when cancelled late */
  fee: number;
  paid: number;
  refund: number;
}

export function cancellationTerms(
  booking: { pickupDateTime: Date; totalAmount: unknown; totalDays: number; status?: string },
  paid: number,
  now: Date = new Date()
): CancellationTerms {
  const freeUntil = new Date(booking.pickupDateTime.getTime() - FREE_CANCELLATION_HOURS * 60 * 60 * 1000);
  const isFree = booking.status === 'REQUIRES_REVIEW' || now.getTime() <= freeUntil.getTime();
  const rentalTotal = Number(booking.totalAmount) || 0;
  const oneDay = roundMoney(rentalTotal / Math.max(1, booking.totalDays || 1));
  // The fee can never be more than what was actually paid
  const fee = isFree ? 0 : roundMoney(Math.min(oneDay, rentalTotal, paid));
  return { isFree, freeUntil, fee, paid: roundMoney(paid), refund: roundMoney(Math.max(0, paid - fee)) };
}
