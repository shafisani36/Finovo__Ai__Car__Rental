import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { POINT_VALUE } from './loyalty.service';

/**
 * Invite a friend:
 * - every customer has a personal code such as FIN7K3QX9;
 * - a new customer can enter it at signup (optional);
 * - the inviter gets REFERRAL_REWARD_POINTS once the friend has finished a first paid rental.
 * The reward waits for a real completed rental so fake signups earn nothing.
 */
export const REFERRAL_REWARD_POINTS = 500;
/** Upper limit of rewarded referrals per customer, against abuse. */
export const MAX_REWARDED_REFERRALS = 50;

/** Letters and digits without look-alikes (no 0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'FIN';
const CODE_BODY_LENGTH = 6;
export const REFERRAL_CODE_PATTERN = new RegExp(`^${CODE_PREFIX}[${CODE_ALPHABET}]{${CODE_BODY_LENGTH}}$`);

type Db = Prisma.TransactionClient | typeof prisma;

export function normalizeReferralCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '');
}

function randomCode(): string {
  const bytes = crypto.randomBytes(CODE_BODY_LENGTH);
  let body = '';
  for (let i = 0; i < CODE_BODY_LENGTH; i++) body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return CODE_PREFIX + body;
}

/** First name plus the first letter of the last name, so a friend can be recognised without showing full details. */
function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export class ReferralService {
  /** The customer's invite code, created the first time it is asked for. */
  static async ensureCode(customerId: string): Promise<string> {
    const existing = await prisma.customer.findUnique({ where: { id: customerId }, select: { referralCode: true } });
    if (!existing) throw AppError.notFound('Customer not found');
    if (existing.referralCode) return existing.referralCode;

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = randomCode();
      try {
        // Only fills the code if no other request has filled it in the meantime
        const updated = await prisma.customer.updateMany({
          where: { id: customerId, referralCode: null },
          data: { referralCode: code },
        });
        const current = await prisma.customer.findUnique({ where: { id: customerId }, select: { referralCode: true } });
        if (current?.referralCode) return current.referralCode;
        if (updated.count === 0) continue;
      } catch (err) {
        // Same code already given to someone else: try another one
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
        throw err;
      }
    }
    throw new AppError('Could not create an invite code. Please try again.', 500);
  }

  /**
   * Finds the customer behind an invite code. Throws a clear error for a wrong code, so a random
   * value can never be saved. Returns null when no code was entered (the code is optional).
   */
  static async resolveCode(rawCode: unknown, newCustomerEmail?: string, db: Db = prisma) {
    const code = normalizeReferralCode(rawCode);
    if (!code) return null;
    if (!REFERRAL_CODE_PATTERN.test(code)) {
      throw AppError.badRequest('This invite code is not valid. Please check it or leave the field empty.');
    }
    const referrer = await db.customer.findUnique({
      where: { referralCode: code },
      select: { id: true, email: true, user: { select: { status: true } } },
    });
    // The inviter must be a real customer with an active account
    if (!referrer || !referrer.user || referrer.user.status !== 'ACTIVE') {
      throw AppError.badRequest('This invite code is not valid. Please check it or leave the field empty.');
    }
    // Same answer as a wrong code, so the check never confirms whose code it is
    if (newCustomerEmail && referrer.email.toLowerCase() === newCustomerEmail.toLowerCase()) {
      throw AppError.badRequest('This invite code is not valid. Please check it or leave the field empty.');
    }
    return { id: referrer.id, code };
  }

  /** Public check used by the signup form while typing. Never says who owns the code. */
  static async isValidCode(rawCode: unknown): Promise<boolean> {
    try {
      return Boolean(await ReferralService.resolveCode(rawCode));
    } catch {
      return false;
    }
  }

  /**
   * Gives the inviter their reward once the invited friend has finished their first rental.
   * Safe to call many times: the reward is stored with a unique key. Never throws.
   */
  static async rewardForCompletedRental(customerId: string): Promise<void> {
    try {
      const friend = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          driverLicenseNumber: true,
          referredById: true,
          referredBy: { select: { id: true, phone: true, driverLicenseNumber: true } },
          _count: { select: { bookings: { where: { status: 'COMPLETED' } } } },
        },
      });
      if (!friend?.referredBy || friend._count.bookings < 1) return;
      const inviter = friend.referredBy;
      if (inviter.id === friend.id) return;

      // Same driving licence or phone on both accounts means one person invited themselves
      const sameLicence =
        Boolean(friend.driverLicenseNumber) &&
        friend.driverLicenseNumber!.trim().toUpperCase() === (inviter.driverLicenseNumber || '').trim().toUpperCase();
      const samePhone = Boolean(friend.phone) && friend.phone === inviter.phone;
      if (sameLicence || samePhone) {
        await prisma.securityAuditLog.create({
          data: {
            event: 'REFERRAL_REWARD_BLOCKED',
            metadata: JSON.stringify({ inviterId: inviter.id, friendId: friend.id, sameLicence, samePhone }),
          },
        });
        return;
      }

      const rewarded = await prisma.loyaltyPointEntry.count({ where: { customerId: inviter.id, type: 'REFERRAL_BONUS' } });
      if (rewarded >= MAX_REWARDED_REFERRALS) return;

      try {
        await prisma.loyaltyPointEntry.create({
          data: {
            customerId: inviter.id,
            points: REFERRAL_REWARD_POINTS,
            type: 'REFERRAL_BONUS',
            description: `Invite reward: ${shortName(friend.fullName)} finished a first rental`,
            referenceKey: `REFERRAL:${friend.id}`,
          },
        });
      } catch (err) {
        // Already rewarded for this friend
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
        throw err;
      }

      await prisma.customerNotification.create({
        data: {
          customerId: inviter.id,
          category: 'REWARDS',
          title: 'You earned invite points',
          message: `${shortName(friend.fullName)} finished a first rental with Finovo. ${REFERRAL_REWARD_POINTS} points were added to your account.`,
          actionUrl: '/customer/rewards',
        },
      });
      await prisma.securityAuditLog.create({
        data: {
          event: 'REFERRAL_REWARD_GRANTED',
          metadata: JSON.stringify({ inviterId: inviter.id, friendId: friend.id, points: REFERRAL_REWARD_POINTS }),
        },
      });
    } catch (err) {
      console.error('[ReferralService] Referral reward failed:', err);
    }
  }

  /** What the rewards page shows: the code, the reward and the list of invited friends. */
  static async summary(customerId: string) {
    const code = await ReferralService.ensureCode(customerId);
    const [friends, entries] = await Promise.all([
      prisma.customer.findMany({
        where: { referredById: customerId },
        select: {
          id: true,
          fullName: true,
          referredAt: true,
          createdAt: true,
          _count: { select: { bookings: { where: { status: 'COMPLETED' } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.loyaltyPointEntry.findMany({
        where: { customerId, type: 'REFERRAL_BONUS' },
        select: { referenceKey: true, points: true },
      }),
    ]);
    const rewardedFriends = new Map(entries.map((e) => [e.referenceKey.replace('REFERRAL:', ''), e.points]));
    return {
      code,
      rewardPoints: REFERRAL_REWARD_POINTS,
      rewardValue: Math.round(REFERRAL_REWARD_POINTS * POINT_VALUE * 100) / 100,
      pointsEarned: entries.reduce((sum, e) => sum + e.points, 0),
      friends: friends.map((f) => ({
        name: shortName(f.fullName),
        joinedAt: f.referredAt || f.createdAt,
        status: rewardedFriends.has(f.id) ? 'REWARDED' : f._count.bookings > 0 ? 'COMPLETED' : 'JOINED',
        points: rewardedFriends.get(f.id) || 0,
      })),
    };
  }
}
