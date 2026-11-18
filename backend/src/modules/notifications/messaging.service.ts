import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { renderMessage, type MessageTemplate } from './message-templates';
import { BookingEmails } from './booking-emails';

/** International phone number format required by SMS and WhatsApp providers, e.g. +966501234567 */
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/** Turns what a customer typed (spaces, dashes, 00 prefix) into +<country><number>, or null. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.replace(/[\s\-().]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  return E164_PATTERN.test(value) ? value : null;
}

function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : '****';
}

type Channel = 'SMS' | 'WHATSAPP';

/** How long before pickup / return the reminders are sent. */
const PICKUP_REMINDER_HOURS = 24;
const RETURN_REMINDER_HOURS = 3;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

async function sendWithTwilio(channel: Channel, to: string, body: string): Promise<string> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM } = env.MESSAGING;
  const from = channel === 'WHATSAPP' ? TWILIO_WHATSAPP_FROM : TWILIO_SMS_FROM;
  if (!from) throw new Error(`No ${channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} sender number is configured`);
  const prefix = channel === 'WHATSAPP' ? 'whatsapp:' : '';
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: `${prefix}${to}`, From: `${prefix}${from}`, Body: body }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!response.ok) throw new Error(data.message || `Twilio responded with ${response.status}`);
  return data.sid || '';
}

export class MessagingService {
  /**
   * Sends a booking alert: always by email (to the customer, and to staff where they need to act), and by
   * SMS / WhatsApp on the channels the customer opted in to.
   * Never throws: a failed message must not break a booking, a payment or a handover.
   */
  static async notifyBooking(bookingId: string, template: MessageTemplate, extra: { refund?: number } = {}): Promise<void> {
    void BookingEmails.notify(bookingId, template);
    try {
      if (env.MESSAGING.PROVIDER === 'off') return;
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { include: { user: { select: { preferredLanguage: true, phone: true } } } },
          vehicle: { select: { brand: true, model: true } },
          pickupBranch: { select: { name: true } },
          returnBranch: { select: { name: true } },
        },
      });
      if (!booking) return;
      const { customer } = booking;
      const channels: Channel[] = [];
      if (customer.smsAlerts) channels.push('SMS');
      if (customer.whatsappAlerts) channels.push('WHATSAPP');
      if (channels.length === 0) return;

      const language = customer.user?.preferredLanguage || 'en';
      const isReturn = template === 'RETURN_REMINDER' || template === 'RENTAL_STARTED';
      const when = isReturn ? booking.returnDateTime : booking.pickupDateTime;
      const date = new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(when);
      const body = renderMessage(template, language, {
        name: customer.fullName.split(' ')[0] || customer.fullName,
        number: booking.bookingNumber,
        vehicle: `${booking.vehicle.brand} ${booking.vehicle.model}`,
        date,
        branch: (isReturn ? booking.returnBranch.name : booking.pickupBranch.name) || '',
        amount: `${booking.currency} ${(extra.refund ?? 0).toFixed(2)}`,
      });

      const phone = normalizePhone(customer.phone || customer.user?.phone || null);
      for (const channel of channels) {
        await this.deliver({ channel, template, phone, body, customerId: customer.id, bookingId: booking.id });
      }
    } catch (err) {
      console.error('[messaging] notifyBooking failed:', err instanceof Error ? err.message : err);
    }
  }

  private static async deliver(msg: {
    channel: Channel;
    template: MessageTemplate;
    phone: string | null;
    body: string;
    customerId: string;
    bookingId: string;
  }): Promise<void> {
    const log = (status: 'SENT' | 'FAILED' | 'SKIPPED', extra: { providerMessageId?: string; errorMessage?: string } = {}) =>
      prisma.messageLog.create({
        data: {
          customerId: msg.customerId,
          bookingId: msg.bookingId,
          channel: msg.channel,
          template: msg.template,
          toNumber: msg.phone ? maskPhone(msg.phone) : 'none',
          status,
          providerMessageId: extra.providerMessageId || null,
          errorMessage: extra.errorMessage?.slice(0, 255) || null,
        },
      });

    if (!msg.phone) {
      await log('SKIPPED', { errorMessage: 'No valid phone number in international format' });
      return;
    }
    if (env.MESSAGING.PROVIDER !== 'twilio') {
      if (!env.IS_PRODUCTION) {
        console.log(`[${msg.channel} (dev mock)] to ${maskPhone(msg.phone)}: ${msg.body}`);
      }
      await log('SKIPPED', { errorMessage: `MESSAGING_PROVIDER=${env.MESSAGING.PROVIDER}` });
      return;
    }
    try {
      const sid = await sendWithTwilio(msg.channel, msg.phone, msg.body);
      await log('SENT', { providerMessageId: sid });
    } catch (err) {
      await log('FAILED', { errorMessage: err instanceof Error ? err.message : String(err) });
    }
  }

  /**
   * Sends pickup reminders (24 hours before, also telling staff a delivery or pickup is due) and return reminders (3 hours before).
   * Each booking is claimed with a guarded update first, so several servers never send the same reminder twice.
   */
  static async runReminderSweep(now: Date = new Date()): Promise<{ pickup: number; return: number }> {
    const counts = { pickup: 0, return: 0 };
    const pickupDue = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'RESERVED', 'READY_FOR_PICKUP'] },
        pickupReminderSentAt: null,
        pickupDateTime: { gt: now, lte: new Date(now.getTime() + PICKUP_REMINDER_HOURS * 3600 * 1000) },
      },
      select: { id: true },
      take: 200,
    });
    for (const b of pickupDue) {
      const claim = await prisma.booking.updateMany({ where: { id: b.id, pickupReminderSentAt: null }, data: { pickupReminderSentAt: now } });
      if (claim.count === 1) {
        await this.notifyBooking(b.id, 'PICKUP_REMINDER');
        counts.pickup++;
      }
    }

    const returnDue = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        returnReminderSentAt: null,
        returnDateTime: { gt: now, lte: new Date(now.getTime() + RETURN_REMINDER_HOURS * 3600 * 1000) },
      },
      select: { id: true },
      take: 200,
    });
    for (const b of returnDue) {
      const claim = await prisma.booking.updateMany({ where: { id: b.id, returnReminderSentAt: null }, data: { returnReminderSentAt: now } });
      if (claim.count === 1) {
        await this.notifyBooking(b.id, 'RETURN_REMINDER');
        counts.return++;
      }
    }
    return counts;
  }

  /** Starts the reminder job (emails always, SMS / WhatsApp when enabled); it does not keep the process alive on shutdown. */
  static startReminderScheduler(): void {
    const run = () =>
      this.runReminderSweep().catch((err) => console.error('[messaging] reminder sweep failed:', err instanceof Error ? err.message : err));
    setTimeout(run, 30 * 1000).unref();
    setInterval(run, SWEEP_INTERVAL_MS).unref();
  }
}
