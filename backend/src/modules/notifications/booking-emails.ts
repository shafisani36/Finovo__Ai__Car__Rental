import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { EmailService, type OutgoingEmail } from '../../infrastructure/email/email.service';
import type { MessageTemplate } from './message-templates';

/** Same business time zone as the rental agreement and the SMS alerts. */
const TIME_ZONE = 'Asia/Riyadh';
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const CUSTOMER_FOOTER = 'You receive this email because you have a booking with Finovo Car Rental.';
const STAFF_FOOTER = 'Staff alert from Finovo Car Rental.';

const BOOKING_INCLUDE = {
  customer: { select: { fullName: true, email: true, phone: true } },
  vehicle: { select: { brand: true, model: true, year: true, registrationNumber: true } },
  pickupBranch: { select: { name: true, address: true, city: true } },
  returnBranch: { select: { name: true, address: true, city: true } },
} satisfies Prisma.BookingInclude;

type BookingForEmail = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;
type Detail = NonNullable<OutgoingEmail['details']>[number];

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(value);
}

function money(amount: unknown, currency: string): string {
  return `${currency} ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function vehicleName(b: BookingForEmail): string {
  return `${b.vehicle.year} ${b.vehicle.brand} ${b.vehicle.model}`;
}

function branchPlace(branch: BookingForEmail['pickupBranch']): string {
  return [branch.name, branch.address, branch.city].filter(Boolean).join(', ');
}

/** Where the customer gets the car: delivered to an address, or collected at the branch. */
function pickupPlace(b: BookingForEmail): string {
  return b.deliveryAddress ? `Delivered to ${b.deliveryAddress}` : `At ${branchPlace(b.pickupBranch)}`;
}

function returnPlace(b: BookingForEmail): string {
  return b.collectionAddress ? `Collected from ${b.collectionAddress}` : `At ${branchPlace(b.returnBranch)}`;
}

function bookingDetails(b: BookingForEmail): Detail[] {
  return [
    { label: 'Booking number', value: `#${b.bookingNumber}` },
    { label: 'Car', value: vehicleName(b) },
    { label: 'Pickup', value: `${formatDateTime(b.pickupDateTime)}, ${pickupPlace(b)}` },
    { label: 'Return', value: `${formatDateTime(b.returnDateTime)}, ${returnPlace(b)}` },
    { label: 'Rental total', value: money(b.totalAmount, b.currency) },
    ...(Number(b.depositAmount) > 0 ? [{ label: 'Refundable deposit', value: money(b.depositAmount, b.currency) }] : []),
  ];
}

function firstName(b: BookingForEmail): string {
  return b.customer.fullName.split(' ')[0] || b.customer.fullName;
}

const customerUrl = (b: BookingForEmail) => `${env.CORS.ORIGIN}/customer/bookings/${b.id}`;
const CHECK_IN_TIP =
  'Save time at pickup: check in online from 72 hours before (licence, ID and a selfie) and just show your QR code.';

/** Customer email for each booking event (the same events as the SMS / WhatsApp alerts). */
function customerEmail(template: MessageTemplate, b: BookingForEmail): OutgoingEmail {
  const hi = `Hi ${firstName(b)},`;
  const view = { label: 'View booking', url: customerUrl(b) };
  const base = { to: b.customer.email, footer: CUSTOMER_FOOTER, action: view };
  switch (template) {
    case 'BOOKING_CONFIRMED':
      return {
        ...base,
        subject: `Booking confirmed: ${vehicleName(b)} (#${b.bookingNumber})`,
        paragraphs: [
          hi,
          `Your booking is confirmed. ${
            b.deliveryAddress
              ? `We will deliver the car to ${b.deliveryAddress} on ${formatDateTime(b.pickupDateTime)}.`
              : `Your car will be ready at ${branchPlace(b.pickupBranch)} on ${formatDateTime(b.pickupDateTime)}.`
          }`,
          'Please have your driving licence and ID with you at pickup.',
          CHECK_IN_TIP,
        ],
        details: bookingDetails(b),
      };
    case 'PICKUP_REMINDER':
      return {
        ...base,
        subject: `Reminder: your ${b.vehicle.brand} ${b.vehicle.model} ${b.deliveryAddress ? 'arrives' : 'is ready'} on ${formatDateTime(b.pickupDateTime)}`,
        paragraphs: [
          hi,
          b.deliveryAddress
            ? `Your car will be delivered to ${b.deliveryAddress} on ${formatDateTime(b.pickupDateTime)}.`
            : `Your car is ready for pickup at ${branchPlace(b.pickupBranch)} on ${formatDateTime(b.pickupDateTime)}.`,
          b.checkedInAt ? 'You are already checked in online: show your QR code at pickup.' : CHECK_IN_TIP,
        ],
        details: bookingDetails(b),
        action: b.checkedInAt ? view : { label: 'Check in online', url: `${customerUrl(b)}/check-in` },
      };
    case 'RENTAL_STARTED':
      return {
        ...base,
        subject: `Your trip has started: ${vehicleName(b)} (#${b.bookingNumber})`,
        paragraphs: [
          hi,
          `You have received the ${vehicleName(b)}. Please return it by ${formatDateTime(b.returnDateTime)} (${returnPlace(b)}) with the same fuel level.`,
          'Your signed rental agreement and the pickup inspection report are in your account. Drive safe!',
        ],
        details: bookingDetails(b),
      };
    case 'RETURN_REMINDER':
      return {
        ...base,
        subject: `Reminder: return the ${b.vehicle.brand} ${b.vehicle.model} by ${formatDateTime(b.returnDateTime)}`,
        paragraphs: [hi, `Please return the car by ${formatDateTime(b.returnDateTime)} (${returnPlace(b)}) with the same fuel level as at pickup.`],
      };
    case 'RENTAL_RETURNED':
      return {
        ...base,
        subject: `Car returned: booking #${b.bookingNumber}`,
        paragraphs: [
          hi,
          `Thank you for renting with Finovo. The ${vehicleName(b)} has been returned.`,
          'Your return inspection report and the final bill are in your account. Any refund of your deposit is sent to your original payment method.',
        ],
        details: [
          { label: 'Booking number', value: `#${b.bookingNumber}` },
          { label: 'Car', value: vehicleName(b) },
          ...(b.finalTotal !== null ? [{ label: 'Final total', value: money(b.finalTotal, b.currency), bold: true }] : []),
        ],
      };
    case 'BOOKING_CANCELLED':
      return {
        ...base,
        subject: `Booking cancelled: #${b.bookingNumber}`,
        paragraphs: [hi, `Your booking #${b.bookingNumber} for the ${vehicleName(b)} has been cancelled.`],
        details: [
          { label: 'Booking number', value: `#${b.bookingNumber}` },
          ...(Number(b.cancellationFee) > 0 ? [{ label: 'Cancellation fee', value: money(b.cancellationFee, b.currency) }] : []),
          { label: 'Refund', value: money(b.refundAmount, b.currency), bold: true },
        ],
      };
  }
}

/** Staff email for the events staff must act on or know about; null when staff need no email. */
function staffEmail(template: MessageTemplate, b: BookingForEmail): Omit<OutgoingEmail, 'to'> | null {
  const customer = `${b.customer.fullName} (${b.customer.email}${b.customer.phone ? `, ${b.customer.phone}` : ''})`;
  const details: Detail[] = [{ label: 'Customer', value: customer }, ...bookingDetails(b)];
  switch (template) {
    case 'BOOKING_CONFIRMED':
      return {
        subject: `New booking #${b.bookingNumber}: ${vehicleName(b)}`,
        paragraphs: [`${b.customer.fullName} booked the ${vehicleName(b)} for ${formatDateTime(b.pickupDateTime)}.`],
        details,
        action: { label: 'Open bookings', url: `${env.CORS.ORIGIN}/admin/bookings` },
        footer: STAFF_FOOTER,
      };
    case 'PICKUP_REMINDER':
      return {
        subject: `${b.deliveryAddress ? 'Delivery' : 'Pickup'} due ${formatDateTime(b.pickupDateTime)}: ${vehicleName(b)} (#${b.bookingNumber})`,
        paragraphs: [
          b.deliveryAddress
            ? `Deliver the ${vehicleName(b)} (${b.vehicle.registrationNumber}) to ${b.deliveryAddress} on ${formatDateTime(b.pickupDateTime)}.`
            : `${b.customer.fullName} collects the ${vehicleName(b)} (${b.vehicle.registrationNumber}) at ${b.pickupBranch.name} on ${formatDateTime(b.pickupDateTime)}.`,
          'Prepare the car, then run the pickup inspection and the handover.',
        ],
        details,
        action: { label: 'Start handover', url: `${env.CORS.ORIGIN}/admin/rentals/handover/${b.id}` },
        footer: STAFF_FOOTER,
      };
    case 'RENTAL_RETURNED':
      return {
        subject: `Car returned: ${vehicleName(b)} (#${b.bookingNumber})`,
        paragraphs: [`The ${vehicleName(b)} (${b.vehicle.registrationNumber}) rented by ${b.customer.fullName} has been returned.`],
        details: [
          { label: 'Customer', value: customer },
          { label: 'Booking number', value: `#${b.bookingNumber}` },
          ...(b.finalTotal !== null ? [{ label: 'Final total', value: money(b.finalTotal, b.currency), bold: true }] : []),
        ],
        action: { label: 'Open rentals', url: `${env.CORS.ORIGIN}/admin/rentals` },
        footer: STAFF_FOOTER,
      };
    case 'BOOKING_CANCELLED':
      return {
        subject: `Booking cancelled: #${b.bookingNumber} (${vehicleName(b)})`,
        paragraphs: [`${b.customer.fullName} cancelled the booking for ${formatDateTime(b.pickupDateTime)}. The car is free again for these dates.`],
        details: [
          { label: 'Customer', value: customer },
          { label: 'Booking number', value: `#${b.bookingNumber}` },
          { label: 'Refund', value: money(b.refundAmount, b.currency) },
        ],
        footer: STAFF_FOOTER,
      };
    default:
      return null;
  }
}

/** STAFF_ALERT_EMAILS when set, otherwise every active admin. */
async function staffRecipients(): Promise<string[]> {
  if (env.EMAIL.STAFF_ALERT_EMAILS.length > 0) return env.EMAIL.STAFF_ALERT_EMAILS;
  const admins = await prisma.user.findMany({
    where: { status: 'ACTIVE', userRoles: { some: { role: { name: { in: STAFF_ROLES } } } } },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

async function sendSafely(email: OutgoingEmail, what: string): Promise<void> {
  try {
    await EmailService.send(email);
  } catch (err) {
    console.error(`[email] ${what} failed:`, err instanceof Error ? err.message : err);
  }
}

/** Builds the payment receipt as a PDF. */
function receiptPdf(input: {
  receiptNumber: string;
  paidAt: Date;
  booking: BookingForEmail;
  lines: Detail[];
  totals: Detail[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Receipt ${input.receiptNumber}`, Author: 'Finovo Car Rental' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const row = (label: string, value: string, bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#222222');
      doc.text(label, 50, y, { width: 330 });
      const labelBottom = doc.y;
      doc.text(value, 380, y, { width: 165, align: 'right' });
      doc.y = Math.max(labelBottom, doc.y) + 4;
    };

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1E0426').text('Finovo Car Rental');
    doc.font('Helvetica').fontSize(13).text('Payment receipt');
    doc.moveDown(0.8);
    row('Receipt number', input.receiptNumber);
    row('Payment date', formatDateTime(input.paidAt));
    row('Customer', `${input.booking.customer.fullName} (${input.booking.customer.email})`);
    for (const d of bookingDetails(input.booking).slice(0, 4)) row(d.label, d.value);

    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor('#1E0426').text('Charges', 50);
    doc.moveDown(0.3);
    for (const d of input.lines) row(d.label, d.value);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.4);
    for (const d of input.totals) row(d.label, d.value, d.bold);

    doc.moveDown(1.5).font('Helvetica').fontSize(9).fillColor('#666666');
    doc.text('Thank you for renting with Finovo. This receipt confirms the payment above for the booking shown.', 50);
    doc.end();
  });
}

export class BookingEmails {
  /**
   * Emails the customer, and staff where they need to act, about a booking event.
   * Never throws: an email problem must not break a booking, a payment or a handover.
   */
  static async notify(bookingId: string, template: MessageTemplate): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
      if (!booking) return;
      await sendSafely(customerEmail(template, booking), `${template} email to the customer`);
      const staff = staffEmail(template, booking);
      if (staff) {
        const to = await staffRecipients();
        if (to.length > 0) await sendSafely({ ...staff, to }, `${template} email to staff`);
      }
    } catch (err) {
      console.error('[email] booking email failed:', err instanceof Error ? err.message : err);
    }
  }

  /** Emails the customer a receipt (with a PDF copy) and tells staff the payment arrived. Never throws. */
  static async paymentReceived(paymentId: string): Promise<void> {
    try {
      const payment = await prisma.payments.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== 'SUCCEEDED') return;
      const booking = await prisma.booking.findUnique({
        where: { id: payment.bookingId },
        include: {
          ...BOOKING_INCLUDE,
          // Lines that existed when this payment was made (return charges are added to the booking later)
          breakdownItems: { where: { createdAt: { lte: payment.updatedAt } }, orderBy: { createdAt: 'asc' } },
          payments: { where: { status: 'SUCCEEDED' }, select: { amount: true } },
        },
      });
      if (!booking) return;

      const currency = payment.currency || booking.currency;
      let card = '';
      try {
        const meta = JSON.parse(payment.metadata || '{}') as { cardBrand?: string; cardNumberLast4?: string };
        if (meta.cardBrand && meta.cardNumberLast4) card = `${meta.cardBrand.toUpperCase()} ending ${meta.cardNumberLast4}`;
      } catch {
        // Older payments may have no readable metadata
      }
      const method = card || payment.provider.replace(/_/g, ' ');
      const paidToDate = booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const amountDue = Number(booking.totalAmount) + Number(booking.depositAmount);
      const balance = Math.max(0, Math.round((amountDue - paidToDate) * 100) / 100);

      const lines: Detail[] = booking.breakdownItems.map((item) => ({ label: item.description, value: money(item.amount, item.currency) }));
      if (Number(booking.depositAmount) > 0 && !booking.breakdownItems.some((i) => i.lineType.toLowerCase().includes('deposit'))) {
        lines.push({ label: 'Refundable security deposit', value: money(booking.depositAmount, currency) });
      }
      const totals: Detail[] = [
        { label: 'Amount paid now', value: money(payment.amount, currency), bold: true },
        { label: 'Payment method', value: method },
        { label: 'Paid to date', value: money(paidToDate, currency) },
        { label: 'Balance due', value: money(balance, currency) },
      ];
      const receiptNumber = payment.id;
      const pdf = await receiptPdf({ receiptNumber, paidAt: payment.updatedAt, booking, lines, totals });

      await sendSafely(
        {
          to: booking.customer.email,
          subject: `Payment receipt: ${money(payment.amount, currency)} for booking #${booking.bookingNumber}`,
          paragraphs: [
            `Hi ${firstName(booking)},`,
            `We have received your payment of ${money(payment.amount, currency)} for booking #${booking.bookingNumber}. Your receipt is below and attached as a PDF.`,
          ],
          details: [
            { label: 'Receipt number', value: receiptNumber },
            { label: 'Car', value: vehicleName(booking) },
            { label: 'Pickup', value: `${formatDateTime(booking.pickupDateTime)}, ${pickupPlace(booking)}` },
            ...lines,
            ...totals,
          ],
          action: { label: 'View payments', url: `${env.CORS.ORIGIN}/customer/payments` },
          footer: CUSTOMER_FOOTER,
          attachments: [{ filename: `Finovo-receipt-${booking.bookingNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
        },
        'payment receipt'
      );

      const to = await staffRecipients();
      if (to.length > 0) {
        await sendSafely(
          {
            to,
            subject: `Payment received: ${money(payment.amount, currency)} for #${booking.bookingNumber}`,
            paragraphs: [`${booking.customer.fullName} paid ${money(payment.amount, currency)} (${method}) for the ${vehicleName(booking)}.`],
            details: [
              { label: 'Customer', value: `${booking.customer.fullName} (${booking.customer.email})` },
              { label: 'Booking number', value: `#${booking.bookingNumber}` },
              { label: 'Pickup', value: `${formatDateTime(booking.pickupDateTime)}, ${pickupPlace(booking)}` },
              ...totals,
            ],
            action: { label: 'Open bookings', url: `${env.CORS.ORIGIN}/admin/bookings` },
            footer: STAFF_FOOTER,
          },
          'payment email to staff'
        );
      }
    } catch (err) {
      console.error('[email] payment receipt failed:', err instanceof Error ? err.message : err);
    }
  }
}
