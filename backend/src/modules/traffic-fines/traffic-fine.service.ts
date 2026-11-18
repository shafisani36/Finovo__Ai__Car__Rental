import type Stripe from 'stripe';
import { Prisma, type TrafficFineStatus, type TrafficFineType } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { EmailService } from '../../infrastructure/email/email.service';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { AuthService } from '../auth/auth.service';
import { storeCustomerDocument } from '../customers/customer-portal.service';
import { getStripe, toMinorUnits } from '../payments/stripe-payment.service';

export const TRAFFIC_FINE_TYPES: TrafficFineType[] = [
  'SPEEDING',
  'RED_LIGHT',
  'PARKING',
  'SEATBELT',
  'MOBILE_PHONE',
  'LANE_VIOLATION',
  'OTHER',
];
const STATUSES: TrafficFineStatus[] = ['UNMATCHED', 'CHARGED', 'DISPUTED', 'PAID', 'WAIVED'];
/** How staff record a fine that was settled outside the card checkout. */
export const OFFLINE_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'DEPOSIT', 'COMPANY'] as const;
/** A renter can dispute a fine up to this many days after it was passed on to them. */
const DISPUTE_WINDOW_DAYS = 14;
/** Small allowance for camera clocks that run a little ahead of the server. */
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;
const MAX_AMOUNT = 1_000_000;
const TIME_ZONE = 'Asia/Riyadh';
const OPEN_INTENT_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

const FINE_INCLUDE = {
  vehicle: { select: { id: true, brand: true, model: true, year: true, registrationNumber: true } },
  booking: { select: { id: true, bookingNumber: true, pickupDateTime: true, returnDateTime: true } },
  customer: { select: { id: true, fullName: true, email: true, phone: true, userId: true } },
} satisfies Prisma.TrafficFineInclude;

type FineRow = Prisma.TrafficFineGetPayload<{ include: typeof FINE_INCLUDE }>;

export interface CreateTrafficFineDTO {
  reference?: unknown;
  plateNumber?: unknown;
  offenceType?: unknown;
  offenceAt?: unknown;
  fineAmount?: unknown;
  adminFee?: unknown;
  location?: unknown;
  authority?: unknown;
  notes?: unknown;
  evidence?: unknown;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Plates are compared without spaces, dashes or case: "rz-2026 21" matches "RZ-2026-21". */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function optionalText(value: unknown, max: number, field: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > max) throw AppError.badRequest(`${field} must be at most ${max} characters`);
  return text;
}

function parseAmount(value: unknown, field: string, allowZero: boolean): number {
  const amount = roundMoney(Number(value));
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0) || amount > MAX_AMOUNT) {
    throw AppError.badRequest(`${field} must be a positive amount`);
  }
  return amount;
}

function totalDue(fine: { fineAmount: unknown; adminFee: unknown }): number {
  return roundMoney(Number(fine.fineAmount) + Number(fine.adminFee || 0));
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(value);
}

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function offenceLabel(type: TrafficFineType): string {
  return type
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function format(fine: FineRow) {
  return {
    id: fine.id,
    reference: fine.reference,
    offenceType: fine.offenceType,
    offenceAt: fine.offenceAt,
    location: fine.location,
    authority: fine.authority,
    fineAmount: Number(fine.fineAmount),
    adminFee: Number(fine.adminFee),
    totalAmount: totalDue(fine),
    currency: fine.currency,
    status: fine.status,
    notes: fine.notes,
    evidenceUrl: fine.evidenceUrl,
    dueAt: fine.dueAt,
    disputeReason: fine.disputeReason,
    disputedAt: fine.disputedAt,
    resolution: fine.resolution,
    resolvedAt: fine.resolvedAt,
    paidAt: fine.paidAt,
    paymentMethod: fine.paymentMethod,
    createdAt: fine.createdAt,
    canDispute:
      fine.status === 'CHARGED' &&
      !fine.disputedAt &&
      Date.now() - fine.createdAt.getTime() <= DISPUTE_WINDOW_DAYS * 86_400_000,
    vehicle: {
      id: fine.vehicle.id,
      name: `${fine.vehicle.year} ${fine.vehicle.brand} ${fine.vehicle.model}`,
      registrationNumber: fine.vehicle.registrationNumber,
    },
    booking: fine.booking
      ? {
          id: fine.booking.id,
          bookingNumber: fine.booking.bookingNumber,
          pickupDateTime: fine.booking.pickupDateTime,
          returnDateTime: fine.booking.returnDateTime,
        }
      : null,
    customer: fine.customer
      ? { id: fine.customer.id, fullName: fine.customer.fullName, email: fine.customer.email, phone: fine.customer.phone }
      : null,
  };
}

export type TrafficFineView = ReturnType<typeof format>;

export class TrafficFineService {
  /** Settings the staff form needs: the default handling fee and the currency. */
  static defaults() {
    return {
      adminFee: env.TRAFFIC_FINES.ADMIN_FEE,
      currency: env.CURRENCY,
      paymentDays: env.TRAFFIC_FINES.PAYMENT_DAYS,
      types: TRAFFIC_FINE_TYPES,
    };
  }

  private static async vehicleByPlate(rawPlate: unknown) {
    const plate = normalizePlate(String(rawPlate ?? ''));
    if (plate.length < 2) throw AppError.badRequest('Enter the number plate shown on the fine');
    const vehicles = await prisma.vehicle.findMany({
      select: { id: true, brand: true, model: true, year: true, registrationNumber: true },
    });
    const vehicle = vehicles.find((v) => normalizePlate(v.registrationNumber) === plate);
    if (!vehicle) throw AppError.notFound(`No fleet car has the number plate ${String(rawPlate).trim()}`);
    return vehicle;
  }

  private static parseOffenceAt(value: unknown): Date {
    const at = new Date(String(value ?? ''));
    if (Number.isNaN(at.getTime())) throw AppError.badRequest('Enter the date and time of the offence');
    if (at.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw AppError.badRequest('The offence date and time cannot be in the future');
    }
    return at;
  }

  /**
   * The rental during which the car was with a renter at that moment. The actual handover and return
   * times win; the booked period is the fallback for trips recorded without a rental record.
   */
  static async findRenter(vehicleId: string, at: Date) {
    const rental = await prisma.rental.findFirst({
      where: {
        vehicleId,
        pickedUpAt: { lte: at },
        OR: [{ returnedAt: null }, { returnedAt: { gte: at } }],
        booking: { status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] } },
      },
      orderBy: { pickedUpAt: 'desc' },
      select: { booking: { select: { id: true, bookingNumber: true, customerId: true, customer: { select: { fullName: true } } } } },
    });
    if (rental) return rental.booking;

    const booking = await prisma.booking.findFirst({
      where: {
        vehicleId,
        status: { in: ['ACTIVE', 'RETURN_INSPECTION', 'COMPLETED'] },
        pickupDateTime: { lte: at },
        returnDateTime: { gte: at },
        rental: null,
      },
      orderBy: { pickupDateTime: 'desc' },
      select: { id: true, bookingNumber: true, customerId: true, customer: { select: { fullName: true } } },
    });
    return booking;
  }

  /** Shows staff who would be charged before the fine is saved. */
  static async preview(rawPlate: unknown, rawAt: unknown) {
    const vehicle = await this.vehicleByPlate(rawPlate);
    const at = this.parseOffenceAt(rawAt);
    const renter = await this.findRenter(vehicle.id, at);
    return {
      vehicle: {
        id: vehicle.id,
        name: `${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
        registrationNumber: vehicle.registrationNumber,
      },
      renter: renter
        ? { bookingId: renter.id, bookingNumber: renter.bookingNumber, customerName: renter.customer.fullName }
        : null,
    };
  }

  /** Records a fine, matches it to the renter at that time and charges them. */
  static async create(dto: CreateTrafficFineDTO, staffUserId?: string) {
    const reference = optionalText(dto.reference, 64, 'Fine number');
    if (!reference) throw AppError.badRequest('Enter the fine number printed on the challan');
    const offenceType = String(dto.offenceType ?? '') as TrafficFineType;
    if (!TRAFFIC_FINE_TYPES.includes(offenceType)) throw AppError.badRequest('Choose the type of offence');
    const offenceAt = this.parseOffenceAt(dto.offenceAt);
    const fineAmount = parseAmount(dto.fineAmount, 'Fine amount', false);
    const requestedFee =
      dto.adminFee === undefined || dto.adminFee === null || dto.adminFee === ''
        ? env.TRAFFIC_FINES.ADMIN_FEE
        : parseAmount(dto.adminFee, 'Handling fee', true);
    const location = optionalText(dto.location, 200, 'Location');
    const authority = optionalText(dto.authority, 120, 'Issuing authority');
    const notes = optionalText(dto.notes, 1000, 'Notes');

    const vehicle = await this.vehicleByPlate(dto.plateNumber);
    const existing = await prisma.trafficFine.findUnique({ where: { reference }, select: { id: true } });
    if (existing) throw AppError.conflict(`Fine ${reference} is already recorded`);

    const evidenceUrl = dto.evidence ? storeCustomerDocument(String(dto.evidence)).url : null;
    const renter = await this.findRenter(vehicle.id, offenceAt);

    let fine: FineRow;
    try {
      fine = await prisma.trafficFine.create({
        data: {
          reference,
          vehicleId: vehicle.id,
          bookingId: renter?.id ?? null,
          customerId: renter?.customerId ?? null,
          offenceType,
          offenceAt,
          location,
          authority,
          fineAmount,
          // The handling fee only applies when the fine is passed on to a renter
          adminFee: renter ? requestedFee : 0,
          currency: env.CURRENCY,
          status: renter ? 'CHARGED' : 'UNMATCHED',
          notes,
          evidenceUrl,
          dueAt: renter ? new Date(Date.now() + env.TRAFFIC_FINES.PAYMENT_DAYS * 86_400_000) : null,
          createdById: staffUserId ?? null,
        },
        include: FINE_INCLUDE,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict(`Fine ${reference} is already recorded`);
      }
      throw err;
    }

    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId ?? null,
        event: 'TRAFFIC_FINE_RECORDED',
        metadata: JSON.stringify({
          fineId: fine.id,
          reference,
          plate: vehicle.registrationNumber,
          bookingNumber: renter?.bookingNumber ?? null,
          amount: totalDue(fine),
        }),
      },
    });

    if (fine.customer) await this.tellRenterAboutFine(fine);
    return format(fine);
  }

  private static async tellRenterAboutFine(fine: FineRow) {
    if (!fine.customer || !fine.booking) return;
    const total = totalDue(fine);
    await prisma.customerNotification.create({
      data: {
        customerId: fine.customer.id,
        category: 'PAYMENT',
        title: 'Traffic fine on your rental',
        message: `A ${offenceLabel(fine.offenceType).toLowerCase()} fine of ${money(total, fine.currency)} was issued on ${formatDateTime(
          fine.offenceAt
        )} while you had the car (booking #${fine.booking.bookingNumber}).`,
        actionUrl: '/customer/fines',
      },
    });

    const details = [
      { label: 'Fine number', value: fine.reference },
      { label: 'Offence', value: offenceLabel(fine.offenceType) },
      { label: 'Date and time', value: formatDateTime(fine.offenceAt) },
      ...(fine.location ? [{ label: 'Location', value: fine.location }] : []),
      ...(fine.authority ? [{ label: 'Issued by', value: fine.authority }] : []),
      { label: 'Car', value: `${fine.vehicle.year} ${fine.vehicle.brand} ${fine.vehicle.model} (${fine.vehicle.registrationNumber})` },
      { label: 'Booking', value: `#${fine.booking.bookingNumber}` },
      { label: 'Fine', value: money(Number(fine.fineAmount), fine.currency) },
      ...(Number(fine.adminFee) > 0 ? [{ label: 'Handling fee', value: money(Number(fine.adminFee), fine.currency) }] : []),
      { label: 'Total to pay', value: money(total, fine.currency), bold: true },
      ...(fine.dueAt ? [{ label: 'Pay by', value: formatDateTime(fine.dueAt) }] : []),
    ];
    try {
      await EmailService.send({
        to: fine.customer.email,
        subject: `Traffic fine ${fine.reference} on booking #${fine.booking.bookingNumber}`,
        paragraphs: [
          `Hi ${fine.customer.fullName.split(' ')[0] || fine.customer.fullName},`,
          'The traffic authority issued a fine for your rental car. Our records show the car was with you at that time, so the fine is passed on to you.',
          `You can pay it online or dispute it within ${DISPUTE_WINDOW_DAYS} days if you think it is wrong.`,
        ],
        details,
        action: { label: 'View and pay the fine', url: `${env.CORS.ORIGIN}/customer/fines` },
        footer: 'You receive this email because you rented a car from Finovo Car Rental.',
      });
    } catch (err) {
      console.error('[email] traffic fine notice failed:', err instanceof Error ? err.message : err);
    }
  }

  /** Staff list with optional status filter and a search across fine number, plate, booking and renter. */
  static async list(filters: { status?: unknown; search?: unknown }) {
    const where: Prisma.TrafficFineWhereInput = {};
    const status = String(filters.status ?? '').toUpperCase() as TrafficFineStatus;
    if (STATUSES.includes(status)) where.status = status;
    const search = String(filters.search ?? '').trim().slice(0, 64);
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { vehicle: { registrationNumber: { contains: search } } },
        { booking: { bookingNumber: { contains: search } } },
        { customer: { fullName: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }
    const [fines, grouped] = await Promise.all([
      prisma.trafficFine.findMany({ where, include: FINE_INCLUDE, orderBy: { offenceAt: 'desc' }, take: 300 }),
      prisma.trafficFine.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<TrafficFineStatus, number>;
    for (const row of grouped) counts[row.status] = row._count._all;
    return { fines: fines.map(format), counts, defaults: this.defaults() };
  }

  /** Fines passed on to the signed-in customer. */
  static async listForCustomer(userId: string) {
    const customer = await prisma.customer.findFirst({ where: { userId }, select: { id: true } });
    if (!customer) throw AppError.notFound('Customer profile not found');
    const fines = await prisma.trafficFine.findMany({
      where: { customerId: customer.id },
      include: FINE_INCLUDE,
      orderBy: { offenceAt: 'desc' },
    });
    const views = fines.map(format);
    const outstanding = roundMoney(
      views.filter((f) => f.status === 'CHARGED' || f.status === 'DISPUTED').reduce((sum, f) => sum + f.totalAmount, 0)
    );
    return { fines: views, outstanding, currency: env.CURRENCY };
  }

  private static async ownFine(fineId: string, userId: string) {
    const fine = await prisma.trafficFine.findUnique({ where: { id: fineId }, include: FINE_INCLUDE });
    if (!fine || !fine.customer || fine.customer.userId !== userId) throw AppError.notFound('Traffic fine not found');
    return fine;
  }

  private static async staffFine(fineId: string) {
    const fine = await prisma.trafficFine.findUnique({ where: { id: fineId }, include: FINE_INCLUDE });
    if (!fine) throw AppError.notFound('Traffic fine not found');
    return fine;
  }

  /** Changes the status only if nobody else changed the fine first. */
  private static async guardedUpdate(fineId: string, from: TrafficFineStatus[], data: Prisma.TrafficFineUpdateManyMutationInput) {
    const result = await prisma.trafficFine.updateMany({ where: { id: fineId, status: { in: from } }, data });
    if (result.count === 0) throw AppError.conflict('This fine was changed a moment ago. Please refresh and try again.');
    return this.staffFine(fineId);
  }

  /** The renter says the fine is not theirs (for example the car was already returned). */
  static async dispute(fineId: string, userId: string, rawReason: unknown) {
    const reason = String(rawReason ?? '').trim();
    if (reason.length < 10) throw AppError.badRequest('Please explain the reason in at least 10 characters');
    if (reason.length > 1000) throw AppError.badRequest('The reason must be at most 1000 characters');
    const fine = await this.ownFine(fineId, userId);
    if (fine.status === 'DISPUTED') throw AppError.conflict('You have already disputed this fine. Our team is reviewing it.');
    if (!format(fine).canDispute) throw AppError.badRequest('This fine can no longer be disputed. Please contact support.');

    const updated = await this.guardedUpdate(fineId, ['CHARGED'], {
      status: 'DISPUTED',
      disputeReason: reason,
      disputedAt: new Date(),
    });
    await prisma.securityAuditLog.create({
      data: { userId, event: 'TRAFFIC_FINE_DISPUTED', metadata: JSON.stringify({ fineId, reference: fine.reference }) },
    });
    return format(updated);
  }

  /** Staff decision on a dispute: accepting waives the fine, rejecting puts it back to pay. */
  static async resolveDispute(fineId: string, staffUserId: string | undefined, decision: unknown, rawResponse: unknown) {
    if (decision !== 'ACCEPT' && decision !== 'REJECT') throw AppError.badRequest('decision must be ACCEPT or REJECT');
    const response = String(rawResponse ?? '').trim();
    if (response.length < 5) throw AppError.badRequest('Write a short answer for the customer');
    if (response.length > 1000) throw AppError.badRequest('The answer must be at most 1000 characters');
    const fine = await this.staffFine(fineId);
    if (fine.status !== 'DISPUTED') throw AppError.badRequest('This fine has no open dispute');
    const accepted = decision === 'ACCEPT';

    const updated = await this.guardedUpdate(fineId, ['DISPUTED'], {
      status: accepted ? 'WAIVED' : 'CHARGED',
      resolution: response,
      resolvedAt: new Date(),
      // A rejected dispute gets a fresh payment period
      ...(accepted ? {} : { dueAt: new Date(Date.now() + env.TRAFFIC_FINES.PAYMENT_DAYS * 86_400_000) }),
    });

    if (updated.customer) {
      await prisma.customerNotification.create({
        data: {
          customerId: updated.customer.id,
          category: 'PAYMENT',
          title: accepted ? 'Fine dispute accepted' : 'Fine dispute reviewed',
          message: accepted
            ? `We removed traffic fine ${fine.reference} from your account. ${response}`
            : `Traffic fine ${fine.reference} stays on your account. ${response}`,
          actionUrl: '/customer/fines',
        },
      });
    }
    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId ?? null,
        event: accepted ? 'TRAFFIC_FINE_DISPUTE_ACCEPTED' : 'TRAFFIC_FINE_DISPUTE_REJECTED',
        metadata: JSON.stringify({ fineId, reference: fine.reference }),
      },
    });
    return format(updated);
  }

  /** Staff cancel a fine (for example the authority withdrew it). */
  static async waive(fineId: string, staffUserId: string | undefined, rawReason: unknown) {
    const reason = String(rawReason ?? '').trim();
    if (reason.length < 5) throw AppError.badRequest('Write the reason for waiving the fine');
    if (reason.length > 1000) throw AppError.badRequest('The reason must be at most 1000 characters');
    const fine = await this.staffFine(fineId);
    if (fine.status === 'PAID' || fine.status === 'WAIVED') throw AppError.badRequest('This fine is already closed');

    const updated = await this.guardedUpdate(fineId, ['UNMATCHED', 'CHARGED', 'DISPUTED'], {
      status: 'WAIVED',
      resolution: reason,
      resolvedAt: new Date(),
    });
    if (updated.customer) {
      await prisma.customerNotification.create({
        data: {
          customerId: updated.customer.id,
          category: 'PAYMENT',
          title: 'Traffic fine removed',
          message: `Traffic fine ${fine.reference} was removed from your account. ${reason}`,
          actionUrl: '/customer/fines',
        },
      });
    }
    await prisma.securityAuditLog.create({
      data: { userId: staffUserId ?? null, event: 'TRAFFIC_FINE_WAIVED', metadata: JSON.stringify({ fineId, reference: fine.reference }) },
    });
    return format(updated);
  }

  /** Staff record a payment made outside the card checkout, or that the company paid the fine itself. */
  static async markPaid(fineId: string, staffUserId: string | undefined, rawMethod: unknown) {
    const method = String(rawMethod ?? '').toUpperCase();
    if (!(OFFLINE_PAYMENT_METHODS as readonly string[]).includes(method)) {
      throw AppError.badRequest(`Payment method must be one of ${OFFLINE_PAYMENT_METHODS.join(', ')}`);
    }
    const fine = await this.staffFine(fineId);
    if (fine.status === 'PAID' || fine.status === 'WAIVED') throw AppError.badRequest('This fine is already closed');
    if (fine.status === 'UNMATCHED' && method !== 'COMPANY') {
      throw AppError.badRequest('A fine with no renter can only be marked as paid by the company');
    }

    const updated = await this.guardedUpdate(fineId, ['UNMATCHED', 'CHARGED', 'DISPUTED'], {
      status: 'PAID',
      paidAt: new Date(),
      paymentMethod: method,
    });
    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId ?? null,
        event: 'TRAFFIC_FINE_MARKED_PAID',
        metadata: JSON.stringify({ fineId, reference: fine.reference, method }),
      },
    });
    return format(updated);
  }

  /** Card checkout for a fine; the amount always comes from the server. */
  static async createPaymentIntent(fineId: string, userId: string) {
    await AuthService.assertEmailVerified(userId);
    const fine = await this.ownFine(fineId, userId);
    if (fine.status !== 'CHARGED') {
      throw AppError.badRequest(fine.status === 'DISPUTED' ? 'This fine is under review' : 'This fine has nothing to pay');
    }
    const stripe = getStripe();
    const amount = totalDue(fine);
    const currency = fine.currency.toLowerCase();
    const minorAmount = toMinorUnits(amount, currency);

    if (fine.paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(fine.paymentIntentId);
      if (existing.amount === minorAmount && existing.currency === currency && OPEN_INTENT_STATUSES.includes(existing.status)) {
        return { paymentIntentId: existing.id, clientSecret: existing.client_secret, amount, currency: fine.currency };
      }
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount: minorAmount,
        currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: fine.customer?.email || undefined,
        description: `Finovo traffic fine ${fine.reference}${fine.booking ? ` - booking ${fine.booking.bookingNumber}` : ''}`,
        // No bookingId here on purpose: fine payments must never count towards the rental balance
        metadata: { trafficFineId: fine.id, fineReference: fine.reference, customerId: fine.customerId ?? '' },
      },
      { idempotencyKey: `traffic-fine-${fine.id}-${minorAmount}-${fine.paymentIntentId ?? 'first'}` }
    );
    await prisma.trafficFine.update({ where: { id: fine.id }, data: { paymentIntentId: intent.id } });
    return { paymentIntentId: intent.id, clientSecret: intent.client_secret, amount, currency: fine.currency };
  }

  /** Called by the client after Stripe confirms the card; the intent is re-read from Stripe. */
  static async confirmPayment(userId: string, rawIntentId: unknown) {
    const paymentIntentId = String(rawIntentId ?? '');
    if (!paymentIntentId) throw AppError.badRequest('paymentIntentId is required');
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const fineId = intent.metadata?.trafficFineId;
    if (!fineId) throw AppError.badRequest('Payment is not linked to a traffic fine');
    await this.ownFine(fineId, userId);
    return this.syncPayment(intent);
  }

  /** Mirrors a Stripe PaymentIntent onto the fine (used by the confirm call and the webhook). */
  static async syncPayment(intent: Stripe.PaymentIntent) {
    const fineId = intent.metadata.trafficFineId;
    const fine = await this.staffFine(fineId);

    if (intent.status !== 'succeeded') {
      const paymentStatus = intent.status === 'canceled' ? 'CANCELLED' : intent.last_payment_error ? 'FAILED' : 'PENDING';
      return { success: true, paymentStatus, message: intent.last_payment_error?.message ?? null, fine: format(fine) };
    }

    const expectedMinor = toMinorUnits(totalDue(fine), fine.currency.toLowerCase());
    if (intent.amount_received < expectedMinor) {
      return { success: true, paymentStatus: 'FAILED', message: 'The amount paid does not match the fine', fine: format(fine) };
    }

    const claimed = await prisma.trafficFine.updateMany({
      where: { id: fineId, status: { in: ['CHARGED', 'DISPUTED'] } },
      data: { status: 'PAID', paidAt: new Date(), paymentMethod: 'CARD', paymentIntentId: intent.id },
    });

    if (claimed.count === 0 && !(fine.status === 'PAID' && fine.paymentIntentId === intent.id)) {
      // The fine was waived or settled another way while the card was being charged: give the money back
      await getStripe().refunds.create(
        { payment_intent: intent.id, reason: 'duplicate' },
        { idempotencyKey: `refund-traffic-fine-${intent.id}` }
      );
      await prisma.securityAuditLog.create({
        data: { event: 'TRAFFIC_FINE_PAYMENT_REFUNDED', metadata: JSON.stringify({ fineId, paymentIntentId: intent.id }) },
      });
      return {
        success: true,
        paymentStatus: 'REFUNDED',
        message: 'This fine was already closed, so your payment has been refunded.',
        fine: format(await this.staffFine(fineId)),
      };
    }

    const paid = await this.staffFine(fineId);
    if (claimed.count > 0) {
      await prisma.securityAuditLog.create({
        data: {
          userId: paid.customer?.userId ?? null,
          event: 'TRAFFIC_FINE_PAID',
          metadata: JSON.stringify({ fineId, reference: paid.reference, paymentIntentId: intent.id }),
        },
      });
      await this.sendReceipt(paid);
    }
    return { success: true, paymentStatus: 'SUCCEEDED', message: null, fine: format(paid) };
  }

  private static async sendReceipt(fine: FineRow) {
    if (!fine.customer) return;
    try {
      await EmailService.send({
        to: fine.customer.email,
        subject: `Payment received: traffic fine ${fine.reference}`,
        paragraphs: [
          `Hi ${fine.customer.fullName.split(' ')[0] || fine.customer.fullName},`,
          'Thank you, we received your payment for this traffic fine. Nothing else is needed from you.',
        ],
        details: [
          { label: 'Fine number', value: fine.reference },
          { label: 'Offence', value: `${offenceLabel(fine.offenceType)}, ${formatDateTime(fine.offenceAt)}` },
          ...(fine.booking ? [{ label: 'Booking', value: `#${fine.booking.bookingNumber}` }] : []),
          { label: 'Paid on', value: formatDateTime(fine.paidAt ?? new Date()) },
          { label: 'Amount paid', value: money(totalDue(fine), fine.currency), bold: true },
        ],
        action: { label: 'View my fines', url: `${env.CORS.ORIGIN}/customer/fines` },
        footer: 'You receive this email because you rented a car from Finovo Car Rental.',
      });
    } catch (err) {
      console.error('[email] traffic fine receipt failed:', err instanceof Error ? err.message : err);
    }
  }
}
