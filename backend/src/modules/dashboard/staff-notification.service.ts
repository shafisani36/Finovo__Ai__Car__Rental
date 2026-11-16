import { prisma } from '../../infrastructure/prisma/prisma.client';

/** Kinds of work that show up in the staff notification bell. */
export type StaffNotificationType =
  | 'INQUIRY_NEW'
  | 'DISPUTE_OPEN'
  | 'BOOKING_REVIEW'
  | 'PICKUP_DUE'
  | 'RETURN_OVERDUE'
  | 'REFUND_MANUAL';

export interface StaffNotification {
  /** Stable id, so the browser can remember which ones were already seen */
  id: string;
  type: StaffNotificationType;
  /** HIGH items are shown first */
  priority: 'HIGH' | 'NORMAL';
  /** Values for the translated text, such as a booking number or a customer name */
  params: Record<string, string | number>;
  /** When the item started, or when it is due (pickups) */
  at: Date;
  /** Admin page that handles the item */
  link: string;
}

/** Pickups starting within this many hours appear in the bell. */
const PICKUP_WINDOW_HOURS = 24;
/** Most items returned per kind, and in total. */
const PER_TYPE_LIMIT = 10;
const TOTAL_LIMIT = 40;

/**
 * Live work list for staff, worked out from the database on every call. Nothing is stored:
 * an item disappears by itself once the work is done (inquiry answered, dispute decided, car handed over...).
 */
export class StaffNotificationService {
  static async list(now: Date = new Date()) {
    const pickupUntil = new Date(now.getTime() + PICKUP_WINDOW_HOURS * 3_600_000);

    const [inquiries, disputes, reviews, pickups, overdue, refunds, counts] = await Promise.all([
      prisma.inquiry.findMany({
        where: { status: 'NEW' },
        select: { id: true, name: true, subject: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE_LIMIT,
      }),
      prisma.damage_charges.findMany({
        where: { status: 'DISPUTED' },
        select: { id: true, disputeOpenedAt: true, createdAt: true, bookings: { select: { bookingNumber: true } } },
        orderBy: { disputeOpenedAt: 'desc' },
        take: PER_TYPE_LIMIT,
      }),
      prisma.booking.findMany({
        where: { status: 'REQUIRES_REVIEW' },
        select: { id: true, bookingNumber: true, createdAt: true, customer: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE_LIMIT,
      }),
      prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'READY_FOR_PICKUP'] },
          rental: null,
          pickupDateTime: { lte: pickupUntil },
        },
        select: {
          id: true,
          bookingNumber: true,
          pickupDateTime: true,
          customer: { select: { fullName: true } },
          vehicle: { select: { brand: true, model: true } },
        },
        orderBy: { pickupDateTime: 'asc' },
        take: PER_TYPE_LIMIT,
      }),
      prisma.rental.findMany({
        where: { status: 'ACTIVE', booking: { returnDateTime: { lt: now } } },
        select: {
          id: true,
          booking: {
            select: {
              bookingNumber: true,
              returnDateTime: true,
              customer: { select: { fullName: true } },
              vehicle: { select: { brand: true, model: true } },
            },
          },
        },
        orderBy: { booking: { returnDateTime: 'asc' } },
        take: PER_TYPE_LIMIT,
      }),
      prisma.refunds.findMany({
        where: { status: 'PENDING', providerRefundId: null },
        select: { id: true, amount: true, createdAt: true, payments: { select: { currency: true, bookings: { select: { bookingNumber: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: PER_TYPE_LIMIT,
      }),
      StaffNotificationService.counts(now, pickupUntil),
    ]);

    const items: StaffNotification[] = [
      ...disputes.map((d) => ({
        id: `dispute:${d.id}`,
        type: 'DISPUTE_OPEN' as const,
        priority: 'HIGH' as const,
        params: { booking: d.bookings.bookingNumber },
        at: d.disputeOpenedAt || d.createdAt,
        link: '/admin/disputes',
      })),
      ...overdue.map((r) => ({
        id: `overdue:${r.id}`,
        type: 'RETURN_OVERDUE' as const,
        priority: 'HIGH' as const,
        params: {
          booking: r.booking.bookingNumber,
          customer: r.booking.customer.fullName,
          vehicle: `${r.booking.vehicle.brand} ${r.booking.vehicle.model}`,
        },
        at: r.booking.returnDateTime,
        link: `/admin/rentals/return/${r.id}`,
      })),
      ...pickups.map((b) => ({
        id: `pickup:${b.id}`,
        type: 'PICKUP_DUE' as const,
        // A pickup time that has already passed needs attention now
        priority: b.pickupDateTime.getTime() <= now.getTime() ? ('HIGH' as const) : ('NORMAL' as const),
        params: {
          booking: b.bookingNumber,
          customer: b.customer.fullName,
          vehicle: `${b.vehicle.brand} ${b.vehicle.model}`,
        },
        at: b.pickupDateTime,
        link: `/admin/rentals/handover/${b.id}`,
      })),
      ...reviews.map((b) => ({
        id: `review:${b.id}`,
        type: 'BOOKING_REVIEW' as const,
        priority: 'NORMAL' as const,
        params: { booking: b.bookingNumber, customer: b.customer.fullName },
        at: b.createdAt,
        link: `/admin/bookings?search=${encodeURIComponent(b.bookingNumber)}`,
      })),
      ...refunds.map((r) => ({
        id: `refund:${r.id}`,
        type: 'REFUND_MANUAL' as const,
        priority: 'NORMAL' as const,
        params: { booking: r.payments.bookings.bookingNumber, amount: Number(r.amount), currency: r.payments.currency },
        at: r.createdAt,
        link: `/admin/bookings?search=${encodeURIComponent(r.payments.bookings.bookingNumber)}`,
      })),
      ...inquiries.map((q) => ({
        id: `inquiry:${q.id}`,
        type: 'INQUIRY_NEW' as const,
        priority: 'NORMAL' as const,
        params: { name: q.name, subject: q.subject },
        at: q.createdAt,
        link: '/admin/inquiries',
      })),
    ];

    // Urgent work first, then the newest
    items.sort((a, b) =>
      a.priority !== b.priority ? (a.priority === 'HIGH' ? -1 : 1) : b.at.getTime() - a.at.getTime()
    );

    return {
      items: items.slice(0, TOTAL_LIMIT),
      counts,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
      generatedAt: now,
    };
  }

  /** Full numbers per kind (the list itself is limited). */
  private static async counts(now: Date, pickupUntil: Date): Promise<Record<StaffNotificationType, number>> {
    const [inquiries, disputes, reviews, pickups, overdue, refunds] = await Promise.all([
      prisma.inquiry.count({ where: { status: 'NEW' } }),
      prisma.damage_charges.count({ where: { status: 'DISPUTED' } }),
      prisma.booking.count({ where: { status: 'REQUIRES_REVIEW' } }),
      prisma.booking.count({
        where: { status: { in: ['CONFIRMED', 'READY_FOR_PICKUP'] }, rental: null, pickupDateTime: { lte: pickupUntil } },
      }),
      prisma.rental.count({ where: { status: 'ACTIVE', booking: { returnDateTime: { lt: now } } } }),
      prisma.refunds.count({ where: { status: 'PENDING', providerRefundId: null } }),
    ]);
    return {
      INQUIRY_NEW: inquiries,
      DISPUTE_OPEN: disputes,
      BOOKING_REVIEW: reviews,
      PICKUP_DUE: pickups,
      RETURN_OVERDUE: overdue,
      REFUND_MANUAL: refunds,
    };
  }
}
