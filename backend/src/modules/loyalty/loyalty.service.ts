import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';

/** Points earned for every 100 units of currency spent on completed rentals. */
export const POINTS_PER_HUNDRED = 10;
/** Value of one point when spent at checkout (10 points = 1 SAR). */
export const POINT_VALUE = 0.1;
/** Smallest number of points that can be spent on a booking. */
export const MIN_REDEEM_POINTS = 100;
/** Points can pay for at most this share of a rental (after promo codes, before tax). */
export const MAX_POINTS_SHARE_PERCENT = 50;

/** Bookings whose spent points go back to the customer (the booking never went ahead). */
const RELEASED_STATUSES = ['CANCELLED', 'EXPIRED', 'REJECTED'] as const;

/** Loyalty tiers by lifetime points earned. Spending points never lowers the tier. */
export const LOYALTY_TIERS = [
  { name: 'Silver', minPoints: 0 },
  { name: 'Gold', minPoints: 500 },
  { name: 'Platinum', minPoints: 2000 },
] as const;

type Db = Prisma.TransactionClient | typeof prisma;

export interface PointsBalance {
  /** All points ever earned: from rentals plus bonus points such as invite rewards */
  earned: number;
  /** Bonus points that did not come from a rental */
  bonus: number;
  redeemed: number;
  available: number;
  totalSpent: number;
  completedRentals: number;
  currency: string | null;
}

export class LoyaltyService {
  /**
   * Works out a customer's points from their bookings, so the balance can never drift from reality:
   * earned on completed rentals and bonus entries, minus points spent on bookings that are still going ahead.
   * Pass the transaction client when spending points so the check and the booking are atomic.
   */
  static async getBalance(customerId: string, db: Db = prisma): Promise<PointsBalance> {
    const completed = await db.booking.findMany({
      where: { customerId, status: 'COMPLETED' },
      select: { totalAmount: true, currency: true },
    });
    const totalSpent = completed.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const bonusSum = await db.loyaltyPointEntry.aggregate({ where: { customerId }, _sum: { points: true } });
    const bonus = bonusSum._sum.points || 0;
    const earned = Math.floor((totalSpent / 100) * POINTS_PER_HUNDRED) + bonus;

    const spent = await db.booking.aggregate({
      where: { customerId, pointsRedeemed: { gt: 0 }, status: { notIn: [...RELEASED_STATUSES] } },
      _sum: { pointsRedeemed: true },
    });
    const redeemed = spent._sum.pointsRedeemed || 0;

    return {
      earned,
      bonus,
      redeemed,
      available: Math.max(0, earned - redeemed),
      totalSpent,
      completedRentals: completed.length,
      currency: completed[0]?.currency || null,
    };
  }

  /** Tier and progress for a lifetime points total. */
  static tierFor(earned: number) {
    let index = 0;
    LOYALTY_TIERS.forEach((tier, i) => {
      if (earned >= tier.minPoints) index = i;
    });
    const tier = LOYALTY_TIERS[index];
    const next = LOYALTY_TIERS[index + 1] || null;
    const progressPercent = next ? Math.min(100, Math.round((earned / next.minPoints) * 100)) : 100;
    return {
      tier: tier.name,
      nextTier: next?.name || null,
      progressPercent,
      pointsToNextTier: next ? Math.max(0, next.minPoints - earned) : 0,
    };
  }

  /**
   * How many of the requested points can be spent on a rental worth `eligibleAmount`, and what they are worth.
   * Requests below the minimum or above the balance are rejected by the caller with a clear message.
   */
  static pointsDiscount(requestedPoints: number, available: number, eligibleAmount: number) {
    const maxByShare = Math.floor(((eligibleAmount * MAX_POINTS_SHARE_PERCENT) / 100) / POINT_VALUE);
    const points = Math.max(0, Math.min(Math.floor(requestedPoints), available, maxByShare));
    return { points, amount: Math.round(points * POINT_VALUE * 100) / 100, maxUsable: Math.min(available, maxByShare) };
  }
}
