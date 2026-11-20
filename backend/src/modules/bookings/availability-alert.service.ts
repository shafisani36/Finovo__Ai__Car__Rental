import { prisma } from '../../infrastructure/prisma/prisma.client';
import { EmailService } from '../../infrastructure/email/email.service';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { BookingService } from './booking.service';

/** A customer can wait for at most this many cars at the same time */
export const MAX_ACTIVE_ALERTS = 5;
/** How often the background job looks for cars that became free */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
/** Alerts checked per run, oldest check first */
const SWEEP_BATCH = 200;
/** The longest trip an alert can cover */
const MAX_TRIP_DAYS = 90;
/** Business time zone, used for the dates in emails and links */
const TIME_ZONE = 'Asia/Riyadh';

export interface CreateAlertInput {
  vehicleId?: unknown;
  pickupDateTime?: unknown;
  returnDateTime?: unknown;
}

function parseDate(raw: unknown, what: string): Date {
  const date = new Date(String(raw ?? ''));
  if (Number.isNaN(date.getTime())) throw AppError.badRequest(`Enter a valid ${what}`);
  return date;
}

/** YYYY-MM-DD in the business time zone, as the checkout page expects */
function localDay(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function readable(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(value);
}

const VEHICLE_SELECT = {
  id: true,
  brand: true,
  model: true,
  year: true,
  primaryImageUrl: true,
  status: true,
  deletedAt: true,
  isBookable: true,
} as const;

/**
 * "Tell me when this car is free": a customer who finds a car taken on the dates they want leaves an alert.
 * A background job (and every cancellation, rejection or end of maintenance) checks the alerts, and the
 * customer gets one email and one app notification as soon as the car is free for those dates.
 */
export class AvailabilityAlertService {
  private static async customerFor(userId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId }, select: { id: true } });
    if (!customer) throw AppError.forbidden('Only customers can set availability alerts');
    return customer;
  }

  private static format(alert: {
    id: string;
    vehicleId: string;
    pickupDateTime: Date;
    returnDateTime: Date;
    status: string;
    notifiedAt: Date | null;
    createdAt: Date;
    vehicle: { brand: string; model: string; year: number; primaryImageUrl: string | null };
  }) {
    return {
      id: alert.id,
      vehicleId: alert.vehicleId,
      vehicleName: `${alert.vehicle.year} ${alert.vehicle.brand} ${alert.vehicle.model}`,
      imageUrl: alert.vehicle.primaryImageUrl,
      pickupDateTime: alert.pickupDateTime,
      returnDateTime: alert.returnDateTime,
      status: alert.status,
      notifiedAt: alert.notifiedAt,
      createdAt: alert.createdAt,
      bookUrl: `/customer/bookings/new?vehicleId=${alert.vehicleId}&pickupDate=${localDay(alert.pickupDateTime)}&returnDate=${localDay(alert.returnDateTime)}`,
    };
  }

  /**
   * Creates an alert for a car that is taken on these dates. When the car is already free, nothing is saved
   * and `availableNow` tells the page to send the customer to the booking instead.
   */
  static async create(userId: string, input: CreateAlertInput) {
    const customer = await this.customerFor(userId);
    const vehicleId = String(input.vehicleId ?? '').trim();
    if (!vehicleId) throw AppError.badRequest('Choose a car');
    const pickup = parseDate(input.pickupDateTime, 'pickup date');
    const dropoff = parseDate(input.returnDateTime, 'return date');
    if (pickup <= new Date()) throw AppError.badRequest('The pickup date must be in the future');
    if (dropoff <= pickup) throw AppError.badRequest('The return date must be after the pickup date');
    if (dropoff.getTime() - pickup.getTime() > MAX_TRIP_DAYS * 24 * 3600 * 1000) {
      throw AppError.badRequest(`A trip can be at most ${MAX_TRIP_DAYS} days`);
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: VEHICLE_SELECT });
    if (!vehicle || vehicle.deletedAt || vehicle.status === 'ARCHIVED' || !vehicle.isBookable) {
      throw AppError.notFound('This car is no longer offered');
    }

    const availability = await BookingService.checkAvailability(vehicleId, pickup, dropoff);
    if (availability.available) return { availableNow: true, created: false, alert: null };

    // The same wait twice is one alert
    const existing = await prisma.availabilityAlert.findFirst({
      where: { customerId: customer.id, vehicleId, status: 'ACTIVE', pickupDateTime: pickup, returnDateTime: dropoff },
      include: { vehicle: { select: VEHICLE_SELECT } },
    });
    if (existing) return { availableNow: false, created: false, alert: this.format(existing) };

    const active = await prisma.availabilityAlert.count({ where: { customerId: customer.id, status: 'ACTIVE' } });
    if (active >= MAX_ACTIVE_ALERTS) {
      throw AppError.badRequest(`You can wait for up to ${MAX_ACTIVE_ALERTS} cars at a time. Remove an alert first.`);
    }

    const alert = await prisma.availabilityAlert.create({
      data: { customerId: customer.id, vehicleId, pickupDateTime: pickup, returnDateTime: dropoff, lastCheckedAt: new Date() },
      include: { vehicle: { select: VEHICLE_SELECT } },
    });
    return { availableNow: false, created: true, alert: this.format(alert) };
  }

  /** Waiting alerts, plus the ones that fired in the last 30 days */
  static async list(userId: string) {
    const customer = await this.customerFor(userId);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const alerts = await prisma.availabilityAlert.findMany({
      where: {
        customerId: customer.id,
        OR: [{ status: 'ACTIVE' }, { status: 'NOTIFIED', notifiedAt: { gte: since } }],
      },
      include: { vehicle: { select: VEHICLE_SELECT } },
      orderBy: [{ status: 'asc' }, { pickupDateTime: 'asc' }],
    });
    return { alerts: alerts.map((a) => this.format(a)), maxActive: MAX_ACTIVE_ALERTS };
  }

  static async cancel(userId: string, alertId: string) {
    const customer = await this.customerFor(userId);
    const removed = await prisma.availabilityAlert.updateMany({
      where: { id: alertId, customerId: customer.id, status: { in: ['ACTIVE', 'NOTIFIED'] } },
      data: { status: 'CANCELLED' },
    });
    if (removed.count === 0) throw AppError.notFound('Alert not found');
    return { removed: true };
  }

  /** Checks the waiting alerts of one car right away (after a cancellation, rejection or end of maintenance). Never throws. */
  static async checkVehicle(vehicleId: string): Promise<void> {
    try {
      const alerts = await prisma.availabilityAlert.findMany({
        where: { vehicleId, status: 'ACTIVE', pickupDateTime: { gt: new Date() } },
        select: { id: true },
        take: SWEEP_BATCH,
      });
      for (const alert of alerts) await this.checkOne(alert.id);
    } catch (err) {
      console.error('[alerts] vehicle check failed:', err instanceof Error ? err.message : err);
    }
  }

  /** Expires past alerts and checks the waiting ones; returns how many customers were told. */
  static async sweep(): Promise<{ expired: number; notified: number }> {
    const now = new Date();
    const expired = await prisma.availabilityAlert.updateMany({
      where: { status: 'ACTIVE', pickupDateTime: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    const due = await prisma.availabilityAlert.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: [{ lastCheckedAt: 'asc' }, { createdAt: 'asc' }],
      take: SWEEP_BATCH,
    });
    let notified = 0;
    for (const alert of due) {
      if (await this.checkOne(alert.id)) notified++;
    }
    return { expired: expired.count, notified };
  }

  /** Tells the customer when the car is free for their dates; true when an email went out. */
  private static async checkOne(alertId: string): Promise<boolean> {
    const alert = await prisma.availabilityAlert.findUnique({
      where: { id: alertId },
      include: { vehicle: { select: VEHICLE_SELECT }, customer: { select: { id: true, fullName: true, email: true } } },
    });
    if (!alert || alert.status !== 'ACTIVE') return false;

    const { available } = await BookingService.checkAvailability(alert.vehicleId, alert.pickupDateTime, alert.returnDateTime);
    if (!available) {
      await prisma.availabilityAlert.update({ where: { id: alert.id }, data: { lastCheckedAt: new Date() } });
      return false;
    }

    // Claim the alert first, so two checks running together send one email
    const claimed = await prisma.availabilityAlert.updateMany({
      where: { id: alert.id, status: 'ACTIVE' },
      data: { status: 'NOTIFIED', notifiedAt: new Date(), lastCheckedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    const view = this.format(alert);
    const carName = view.vehicleName;
    await prisma.customerNotification.create({
      data: {
        customerId: alert.customerId,
        category: 'BOOKING',
        title: `${carName} is free for your dates`,
        message: `${readable(alert.pickupDateTime)} to ${readable(alert.returnDateTime)}. Book it before someone else does.`,
        actionUrl: view.bookUrl,
      },
    });
    try {
      await EmailService.send({
        to: alert.customer.email,
        subject: `Good news: the ${carName} is free for your dates`,
        paragraphs: [
          `Hi ${alert.customer.fullName.split(' ')[0] || alert.customer.fullName},`,
          `The ${carName} you were waiting for is now free for your dates. Cars go quickly, so book it soon: we do not hold it for you.`,
        ],
        details: [
          { label: 'Car', value: carName },
          { label: 'Pickup', value: readable(alert.pickupDateTime) },
          { label: 'Return', value: readable(alert.returnDateTime) },
        ],
        action: { label: 'Book this car', url: `${env.CORS.ORIGIN}${view.bookUrl}` },
        footer: 'You receive this email because you asked us to tell you when this car is free. We send it only once.',
      });
    } catch (err) {
      console.error('[alerts] email failed:', err instanceof Error ? err.message : err);
    }
    return true;
  }

  /** Starts the background check; it does not keep the process alive on shutdown. */
  static startScheduler(): void {
    const run = () =>
      this.sweep()
        .then((r) => {
          if (r.notified || r.expired) console.log(`[alerts] ${r.notified} customer(s) told, ${r.expired} alert(s) expired`);
        })
        .catch((err) => console.error('[alerts] sweep failed:', err instanceof Error ? err.message : err));
    setTimeout(run, 60 * 1000).unref();
    setInterval(run, SWEEP_INTERVAL_MS).unref();
  }
}
