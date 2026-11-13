import { AuthService } from '../auth/auth.service';
import Stripe from 'stripe';
import { Prisma, type payments_status } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { env } from '../../config/env.config';
import { AWAITING_PAYMENT_STATUS, BookingService } from '../bookings/booking.service';

/** Currencies Stripe charges without minor units. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

const PAYABLE_BOOKING_STATUSES = ['PENDING', 'RESERVED', 'CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'REQUIRES_REVIEW'];

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!env.STRIPE.SECRET_KEY) {
    throw new AppError(
      'Online payments are not configured. Set STRIPE_SECRET_KEY in the backend environment.',
      503,
      'PAYMENTS_NOT_CONFIGURED'
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE.SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 });
  }
  return stripeClient;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100);
}

function fromMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? amount : roundMoney(amount / 100);
}

export class StripePaymentService {
  static getPublicConfig() {
    return {
      enabled: Boolean(env.STRIPE.SECRET_KEY && env.STRIPE.PUBLISHABLE_KEY),
      publishableKey: env.STRIPE.PUBLISHABLE_KEY || null,
    };
  }

  private static async getCustomerBooking(userId: string, bookingId: string) {
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      throw AppError.notFound('Customer profile not found');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true, vehicle: { select: { brand: true, model: true } } },
    });
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }
    if (booking.customerId !== customer.id) {
      throw AppError.forbidden('You can only pay for your own bookings');
    }
    return { customer, booking };
  }

  /** Total the customer owes for a booking: rental total plus refundable security deposit. */
  private static amountDue(booking: { totalAmount: unknown; depositAmount: unknown; payments: { status: string; amount: unknown }[] }) {
    const expected = roundMoney(Number(booking.totalAmount) + Number(booking.depositAmount || 0));
    const paid = roundMoney(
      booking.payments.filter((p) => p.status === 'SUCCEEDED').reduce((sum, p) => sum + Number(p.amount), 0)
    );
    return { expected, paid, balance: roundMoney(Math.max(0, expected - paid)) };
  }

  /**
   * Creates (or reuses) a Stripe PaymentIntent for the outstanding balance of a booking.
   * The amount is always computed on the server; a client-supplied amount can only lower it (partial payment).
   */
  static async createPaymentIntent(userId: string, bookingId: string, requestedAmount?: number) {
    if (!bookingId) {
      throw AppError.badRequest('bookingId is required');
    }
    await AuthService.assertEmailVerified(userId);
    const stripe = getStripe();
    const { customer, booking } = await this.getCustomerBooking(userId, bookingId);

    if (!PAYABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw AppError.badRequest(`Booking in ${booking.status} status cannot be paid`);
    }

    // An unpaid online booking whose hold expired must be re-checked before charging
    if (booking.settlementStatus === AWAITING_PAYMENT_STATUS) {
      const availability = await BookingService.checkAvailability(
        booking.vehicleId,
        booking.pickupDateTime,
        booking.returnDateTime,
        booking.id
      );
      if (!availability.available) {
        throw AppError.conflict(availability.conflictReason || 'This car is no longer available for these dates');
      }
    }

    const { balance } = this.amountDue(booking);
    if (balance <= 0) {
      throw AppError.badRequest('This booking is already fully paid');
    }

    let amount = balance;
    if (requestedAmount !== undefined && requestedAmount !== null) {
      const parsed = roundMoney(Number(requestedAmount));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw AppError.badRequest('Payment amount must be a positive number');
      }
      amount = Math.min(parsed, balance);
    }

    const currency = (booking.currency || 'PKR').toLowerCase();
    const minorAmount = toMinorUnits(amount, currency);

    // Reuse an open PaymentIntent for the same amount instead of creating duplicates
    const openPayment = booking.payments.find(
      (p) => p.status === 'PENDING' && p.paymentIntentId && Number(p.amount) === amount
    );
    if (openPayment?.paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(openPayment.paymentIntentId);
      if (
        existing.amount === minorAmount &&
        ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status)
      ) {
        return {
          paymentIntentId: existing.id,
          clientSecret: existing.client_secret,
          amount,
          currency: booking.currency,
        };
      }
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount: minorAmount,
        currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: customer.email || undefined,
        description: `Finovo booking ${booking.bookingNumber} - ${booking.vehicle.brand} ${booking.vehicle.model}`,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          customerId: customer.id,
        },
      },
      { idempotencyKey: `booking-${booking.id}-${minorAmount}-${booking.payments.length}` }
    );

    // Idempotent: the same intent can come back for parallel or repeated requests (Stripe idempotency key),
    // so record it only once instead of failing on the duplicate primary key.
    try {
      await prisma.payments.upsert({
        where: { paymentIntentId: intent.id },
        create: {
          id: `PAY-${intent.id}`,
          bookingId: booking.id,
          amount,
          currency: booking.currency,
          status: 'PENDING',
          provider: 'stripe',
          paymentIntentId: intent.id,
          metadata: JSON.stringify({ type: 'RENTAL_PAYMENT', livemode: intent.livemode }),
          updatedAt: new Date(),
        },
        update: {},
      });
    } catch (err) {
      // Two simultaneous requests can both try to insert; the other one already stored this intent
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount,
      currency: booking.currency,
    };
  }

  /**
   * Called by the client after Stripe confirms the card. The PaymentIntent is re-read from Stripe,
   * so the client cannot fake a successful payment.
   */
  static async confirmPayment(userId: string, paymentIntentId: string) {
    if (!paymentIntentId) {
      throw AppError.badRequest('paymentIntentId is required');
    }
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      throw AppError.badRequest('Payment is not linked to a booking');
    }
    // Ownership check
    await this.getCustomerBooking(userId, bookingId);
    return this.syncPaymentIntent(intent);
  }

  /** Handles verified Stripe webhook events. */
  static async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const stripe = getStripe();
    if (!env.STRIPE.WEBHOOK_SECRET) {
      throw new AppError('Stripe webhook secret is not configured', 503, 'PAYMENTS_NOT_CONFIGURED');
    }
    if (!signature) {
      throw AppError.badRequest('Missing Stripe signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE.WEBHOOK_SECRET);
    } catch {
      throw AppError.badRequest('Invalid Stripe webhook signature');
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const intent = await stripe.paymentIntents.retrieve((event.data.object as Stripe.PaymentIntent).id, {
        expand: ['latest_charge'],
      });
      if (intent.metadata?.bookingId) {
        await this.syncPaymentIntent(intent);
      }
    }
    return { received: true };
  }

  /**
   * Idempotently mirrors a PaymentIntent into the payments table and updates the booking.
   */
  private static async syncPaymentIntent(intent: Stripe.PaymentIntent) {
    const bookingId = intent.metadata.bookingId;
    const currency = intent.currency;
    const charge = typeof intent.latest_charge === 'object' && intent.latest_charge ? intent.latest_charge : null;
    const status: payments_status =
      intent.status === 'succeeded'
        ? 'SUCCEEDED'
        : intent.status === 'canceled'
          ? 'CANCELLED'
          : intent.status !== 'processing' && intent.last_payment_error
            ? 'FAILED'
            : 'PENDING';

    const amount = fromMinorUnits(intent.status === 'succeeded' ? intent.amount_received : intent.amount, currency);
    const card = charge?.payment_method_details?.card;

    const payment = await prisma.payments.upsert({
      where: { paymentIntentId: intent.id },
      create: {
        id: `PAY-${intent.id}`,
        bookingId,
        amount,
        currency: currency.toUpperCase(),
        status,
        provider: 'stripe',
        paymentIntentId: intent.id,
        receiptUrl: charge?.receipt_url || null,
        errorMessage: intent.last_payment_error?.message || null,
        metadata: JSON.stringify({ cardBrand: card?.brand, cardNumberLast4: card?.last4, type: 'RENTAL_PAYMENT' }),
        updatedAt: new Date(),
      },
      update: {
        amount,
        status,
        receiptUrl: charge?.receipt_url || null,
        errorMessage: intent.last_payment_error?.message || null,
        metadata: JSON.stringify({ cardBrand: card?.brand, cardNumberLast4: card?.last4, type: 'RENTAL_PAYMENT' }),
        updatedAt: new Date(),
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (status === 'SUCCEEDED') {
      // If the payment hold expired and the car was taken meanwhile, refund instead of double booking
      if (booking.status === 'PENDING' && booking.settlementStatus === AWAITING_PAYMENT_STATUS) {
        const availability = await BookingService.checkAvailability(
          booking.vehicleId,
          booking.pickupDateTime,
          booking.returnDateTime,
          booking.id
        );
        if (!availability.available) {
          await getStripe().refunds.create(
            { payment_intent: intent.id, reason: 'requested_by_customer' },
            { idempotencyKey: `refund-unavailable-${intent.id}` }
          );
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'CANCELLED', settlementStatus: 'REFUNDED' },
          });
          await prisma.payments.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
          throw AppError.conflict(
            'This car was booked by someone else while your payment was processing. Your payment has been refunded.'
          );
        }
      }

      const { expected, paid } = this.amountDue(booking);
      const settled = paid >= expected;
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
          settlementStatus: settled ? 'SETTLED' : 'PARTIALLY_PAID',
        },
      });

      const alreadyNotified = await prisma.customerNotification.findFirst({
        where: { customerId: booking.customerId, category: 'PAYMENT', actionUrl: `/customer/payments?pi=${intent.id}` },
      });
      if (!alreadyNotified) {
        await prisma.customerNotification.create({
          data: {
            customerId: booking.customerId,
            category: 'PAYMENT',
            title: 'Payment Successful',
            message: `Your payment of ${currency.toUpperCase()} ${amount.toLocaleString()} for booking #${booking.bookingNumber} was received.`,
            actionUrl: `/customer/payments?pi=${intent.id}`,
          },
        });
      }
    }

    const refreshed = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: { select: { brand: true, model: true } } },
    });

    return {
      success: status === 'SUCCEEDED',
      paymentStatus: status,
      message: intent.last_payment_error?.message || null,
      payment: {
        id: payment.id,
        amount,
        currency: currency.toUpperCase(),
        status,
        receiptUrl: charge?.receipt_url || null,
        cardBrand: card?.brand || null,
        cardNumberLast4: card?.last4 || null,
      },
      booking: refreshed,
    };
  }
}
