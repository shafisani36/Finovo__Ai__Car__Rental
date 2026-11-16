import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';

type Db = Prisma.TransactionClient | typeof prisma;

/** Bookings that no longer use up a promo code (they never went ahead). */
const RELEASED_STATUSES = ['CANCELLED', 'EXPIRED', 'REJECTED'] as const;

export interface PromoCodeInput {
  code?: unknown;
  description?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  maxDiscountAmount?: unknown;
  minRentalAmount?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  maxRedemptions?: unknown;
  maxRedemptionsPerCustomer?: unknown;
  isActive?: unknown;
}

/** Codes are stored and compared in upper case, letters, digits and dashes only. */
export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;

function optionalNumber(value: unknown, field: string, { min = 0, integer = false } = {}): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    throw AppError.badRequest(`${field} must be ${integer ? 'a whole number' : 'a number'} of at least ${min}`);
  }
  return n;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw AppError.badRequest(`${field} is not a valid date`);
  return d;
}

export class PromoCodeService {
  /** Validates staff input and returns the data to store. */
  private static parseInput(input: PromoCodeInput, partial: boolean) {
    const data: Prisma.PromoCodeUncheckedCreateInput = {} as Prisma.PromoCodeUncheckedCreateInput;

    if (!partial || input.code !== undefined) {
      const code = normalizePromoCode(input.code);
      if (!CODE_PATTERN.test(code)) {
        throw AppError.badRequest('Code must be 3 to 32 characters: letters, numbers and dashes only');
      }
      data.code = code;
    }
    if (!partial || input.discountType !== undefined) {
      const type = String(input.discountType || 'PERCENT').toUpperCase();
      if (type !== 'PERCENT' && type !== 'FIXED') throw AppError.badRequest('Discount type must be PERCENT or FIXED');
      data.discountType = type;
    }
    if (!partial || input.discountValue !== undefined) {
      const value = optionalNumber(input.discountValue, 'Discount value', { min: 0.01 });
      if (value === null) throw AppError.badRequest('Discount value is required');
      data.discountValue = value;
    }
    const type = data.discountType;
    if (type === 'PERCENT' && Number(data.discountValue) > 100) {
      throw AppError.badRequest('A percentage discount cannot be more than 100%');
    }
    if (input.description !== undefined) data.description = String(input.description || '').trim().slice(0, 255) || null;
    if (input.maxDiscountAmount !== undefined) data.maxDiscountAmount = optionalNumber(input.maxDiscountAmount, 'Maximum discount', { min: 0.01 });
    if (input.minRentalAmount !== undefined) data.minRentalAmount = optionalNumber(input.minRentalAmount, 'Minimum rental amount');
    if (input.startsAt !== undefined) data.startsAt = optionalDate(input.startsAt, 'Start date');
    if (input.endsAt !== undefined) data.endsAt = optionalDate(input.endsAt, 'End date');
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      throw AppError.badRequest('End date must be after the start date');
    }
    if (input.maxRedemptions !== undefined) data.maxRedemptions = optionalNumber(input.maxRedemptions, 'Total uses', { min: 1, integer: true });
    if (input.maxRedemptionsPerCustomer !== undefined) {
      data.maxRedemptionsPerCustomer =
        optionalNumber(input.maxRedemptionsPerCustomer, 'Uses per customer', { min: 1, integer: true }) ?? 1;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive === true || input.isActive === 'true';
    return data;
  }

  static async list() {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    const usage = await prisma.booking.groupBy({
      by: ['promoCodeId'],
      where: { promoCodeId: { in: codes.map((c) => c.id) }, status: { notIn: [...RELEASED_STATUSES] } },
      _count: { _all: true },
      _sum: { promoDiscount: true },
    });
    const byId = new Map(usage.map((u) => [u.promoCodeId, u]));
    return codes.map((c) => ({
      ...c,
      timesUsed: byId.get(c.id)?._count._all || 0,
      totalDiscountGiven: Number(byId.get(c.id)?._sum.promoDiscount || 0),
    }));
  }

  static async create(input: PromoCodeInput, actorUserId?: string) {
    const data = this.parseInput(input, false);
    const existing = await prisma.promoCode.findUnique({ where: { code: data.code } });
    if (existing) throw AppError.conflict('A promo code with this name already exists');
    return prisma.promoCode.create({ data: { ...data, createdById: actorUserId || null } });
  }

  static async update(id: string, input: PromoCodeInput) {
    const current = await prisma.promoCode.findUnique({ where: { id } });
    if (!current) throw AppError.notFound('Promo code not found');
    const data = this.parseInput(
      { discountType: current.discountType, discountValue: current.discountValue, ...input },
      true
    );
    if (data.code && data.code !== current.code) {
      const clash = await prisma.promoCode.findUnique({ where: { code: data.code } });
      if (clash) throw AppError.conflict('A promo code with this name already exists');
    }
    return prisma.promoCode.update({ where: { id }, data });
  }

  /** Codes already used on bookings are switched off instead of deleted, so booking history stays intact. */
  static async remove(id: string) {
    const current = await prisma.promoCode.findUnique({ where: { id } });
    if (!current) throw AppError.notFound('Promo code not found');
    const used = await prisma.booking.count({ where: { promoCodeId: id } });
    if (used > 0) {
      await prisma.promoCode.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await prisma.promoCode.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  /**
   * Checks that a code can be used by this customer on a rental worth `eligibleAmount`
   * and returns the discount. Throws a clear, customer-facing error otherwise.
   * Run inside the booking transaction so usage limits cannot be beaten by parallel bookings.
   */
  static async evaluate(rawCode: unknown, customerId: string | null, eligibleAmount: number, db: Db = prisma, excludeBookingId?: string) {
    const code = normalizePromoCode(rawCode);
    if (!code) throw AppError.badRequest('Enter a promo code');
    const promo = await db.promoCode.findUnique({ where: { code } });
    const now = new Date();
    if (!promo || !promo.isActive) throw AppError.badRequest('This promo code is not valid');
    if (promo.startsAt && promo.startsAt > now) throw AppError.badRequest('This promo code is not active yet');
    if (promo.endsAt && promo.endsAt <= now) throw AppError.badRequest('This promo code has expired');
    if (promo.minRentalAmount && eligibleAmount < Number(promo.minRentalAmount)) {
      throw AppError.badRequest(`This promo code needs a rental of at least ${Number(promo.minRentalAmount).toFixed(2)}`);
    }

    const activeUse = { promoCodeId: promo.id, status: { notIn: [...RELEASED_STATUSES] }, ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) };
    if (promo.maxRedemptions !== null) {
      const used = await db.booking.count({ where: activeUse });
      if (used >= promo.maxRedemptions) throw AppError.badRequest('This promo code has been fully used');
    }
    if (customerId) {
      const usedByCustomer = await db.booking.count({ where: { ...activeUse, customerId } });
      if (usedByCustomer >= promo.maxRedemptionsPerCustomer) {
        throw AppError.badRequest('You have already used this promo code');
      }
    }

    const value = Number(promo.discountValue);
    let amount = promo.discountType === 'PERCENT' ? (eligibleAmount * value) / 100 : value;
    if (promo.maxDiscountAmount !== null) amount = Math.min(amount, Number(promo.maxDiscountAmount));
    amount = Math.round(Math.min(amount, eligibleAmount) * 100) / 100;

    return {
      promoCodeId: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: value,
      amount,
    };
  }
}
