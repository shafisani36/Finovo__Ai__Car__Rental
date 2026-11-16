import { randomUUID } from 'crypto';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { getStripe, toMinorUnits } from './stripe-payment.service';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface RefundOutcome {
  /** Refunded through Stripe (succeeded or being processed by the bank) */
  refundedOnline: number;
  /** Paid by bank transfer or cash, or Stripe is not set up: staff must pay this back by hand */
  pendingManual: number;
  failed: number;
}

export class RefundService {
  /** Money paid for a booking that has not been refunded yet. */
  static async refundableAmount(bookingId: string): Promise<number> {
    const payments = await prisma.payments.findMany({
      where: { bookingId, status: { in: ['SUCCEEDED', 'REFUNDED'] } },
      include: { refunds: true },
    });
    return roundMoney(
      payments.reduce((sum, p) => {
        if (p.status !== 'SUCCEEDED' && p.status !== 'REFUNDED') return sum;
        const refunded = p.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + Number(r.amount), 0);
        return sum + Math.max(0, Number(p.amount) - refunded);
      }, 0)
    );
  }

  /**
   * Gives back `amount` of what was paid for a booking, newest payment first.
   * Card payments are refunded through Stripe (each refund has an idempotency key, so a retry never pays twice);
   * other payments are recorded as PENDING refunds for staff to pay back by hand.
   */
  static async refundBooking(bookingId: string, amount: number, reason: string): Promise<RefundOutcome> {
    const outcome: RefundOutcome = { refundedOnline: 0, pendingManual: 0, failed: 0 };
    let remaining = roundMoney(amount);
    if (remaining <= 0) return outcome;

    const payments = await prisma.payments.findMany({
      where: { bookingId, status: 'SUCCEEDED' },
      include: { refunds: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const payment of payments) {
      if (remaining <= 0) break;
      const alreadyRefunded = payment.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + Number(r.amount), 0);
      const refundable = roundMoney(Number(payment.amount) - alreadyRefunded);
      const take = roundMoney(Math.min(remaining, refundable));
      if (take <= 0) continue;

      const isCard = payment.provider === 'stripe' && Boolean(payment.paymentIntentId) && Boolean(env.STRIPE.SECRET_KEY);
      let status: 'SUCCEEDED' | 'PENDING' | 'FAILED' = 'PENDING';
      let providerRefundId: string | null = null;

      if (isCard) {
        try {
          const refund = await getStripe().refunds.create(
            {
              payment_intent: payment.paymentIntentId!,
              amount: toMinorUnits(take, payment.currency),
              reason: 'requested_by_customer',
              metadata: { bookingId, reason: reason.slice(0, 200) },
            },
            { idempotencyKey: `booking-refund-${payment.id}-${Math.round(alreadyRefunded * 100)}-${Math.round(take * 100)}` }
          );
          providerRefundId = refund.id;
          status = refund.status === 'succeeded' ? 'SUCCEEDED' : refund.status === 'failed' || refund.status === 'canceled' ? 'FAILED' : 'PENDING';
        } catch (err) {
          console.error('[refund] Stripe refund failed:', err instanceof Error ? err.message : err);
          status = 'FAILED';
        }
      }

      await prisma.refunds.create({
        data: {
          id: randomUUID(),
          paymentId: payment.id,
          amount: take,
          reason: (isCard ? reason : `${reason} (refund by hand)`).slice(0, 255),
          status,
          providerRefundId,
          updatedAt: new Date(),
        },
      });

      if (status === 'FAILED') {
        outcome.failed = roundMoney(outcome.failed + take);
        continue;
      }
      if (isCard) outcome.refundedOnline = roundMoney(outcome.refundedOnline + take);
      else outcome.pendingManual = roundMoney(outcome.pendingManual + take);

      if (roundMoney(alreadyRefunded + take) >= Number(payment.amount)) {
        await prisma.payments.update({ where: { id: payment.id }, data: { status: 'REFUNDED', updatedAt: new Date() } });
      }
      remaining = roundMoney(remaining - take);
    }
    return outcome;
  }
}
