import QRCode from 'qrcode';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { EmailService } from '../../infrastructure/email/email.service';
import { storeCustomerDocument } from './customer-portal.service';

/** Online check-in opens this long before pickup. */
const CHECK_IN_OPENS_BEFORE_PICKUP_MS = 72 * 3600 * 1000;
const CHECK_IN_STATUSES = ['CONFIRMED', 'READY_FOR_PICKUP'];
const LICENCE_TYPES = ['DRIVER_LICENSE_FRONT', 'DRIVER_LICENSE_BACK'];
const IDENTITY_TYPES = ['NATIONAL_ID', 'PASSPORT'];

export type CheckInProblem = 'MISSING' | 'REJECTED' | 'EXPIRES_BEFORE_RETURN';
export interface CheckInRequirement {
  key: 'DRIVER_LICENSE' | 'IDENTITY';
  ok: boolean;
  problem: CheckInProblem | null;
}

type DocumentRow = { documentType: string; verificationStatus: string; expiresAt: Date | null };

/** A document set passes when every needed side is uploaded, not rejected and valid until the car is back. */
function requirement(
  key: CheckInRequirement['key'],
  docs: DocumentRow[],
  types: string[],
  needsAll: boolean,
  returnDateTime: Date
): CheckInRequirement {
  const found = types.map((type) => docs.find((d) => d.documentType === type)).filter(Boolean) as DocumentRow[];
  const usable = found.filter((d) => d.verificationStatus !== 'REJECTED');
  let problem: CheckInProblem | null = null;
  if (needsAll ? found.length < types.length : found.length === 0) problem = 'MISSING';
  else if (needsAll ? usable.length < types.length : usable.length === 0) problem = 'REJECTED';
  else if (usable.some((d) => d.expiresAt && d.expiresAt < returnDateTime)) problem = 'EXPIRES_BEFORE_RETURN';
  return { key, ok: problem === null, problem };
}

/**
 * Online check-in: before pickup the customer confirms their licence and ID are on file and valid for the whole
 * trip, and takes a selfie. Staff then only compare the person with the selfie and hand over the keys; the QR
 * code opens the handover screen on a staff device.
 */
export class CheckInService {
  private static async ownBooking(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            email: true,
            documents: { select: { documentType: true, verificationStatus: true, expiresAt: true } },
          },
        },
        vehicle: { select: { brand: true, model: true, year: true } },
      },
    });
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.customer.userId !== userId) throw AppError.forbidden('You can only check in for your own booking');
    return booking;
  }

  private static evaluate(booking: Awaited<ReturnType<typeof CheckInService.ownBooking>>) {
    const opensAt = new Date(booking.pickupDateTime.getTime() - CHECK_IN_OPENS_BEFORE_PICKUP_MS);
    const requirements = [
      requirement('DRIVER_LICENSE', booking.customer.documents, LICENCE_TYPES, true, booking.returnDateTime),
      requirement('IDENTITY', booking.customer.documents, IDENTITY_TYPES, false, booking.returnDateTime),
    ];
    const statusAllows = CHECK_IN_STATUSES.includes(booking.status);
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      vehicle: `${booking.vehicle.year} ${booking.vehicle.brand} ${booking.vehicle.model}`,
      pickupDateTime: booking.pickupDateTime,
      deliveryAddress: booking.deliveryAddress,
      checkedInAt: booking.checkedInAt,
      selfieUrl: booking.checkInSelfieUrl,
      opensAt,
      /** Check-in can be done (or redone) now */
      open: statusAllows && Date.now() >= opensAt.getTime(),
      statusAllows,
      requirements,
    };
  }

  /** Where staff land when they scan the customer's QR code. */
  static handoverUrl(bookingId: string): string {
    return `${env.CORS.ORIGIN}/admin/rentals/handover/${bookingId}`;
  }

  static async status(userId: string, bookingId: string) {
    return this.evaluate(await this.ownBooking(userId, bookingId));
  }

  static async complete(userId: string, bookingId: string, payload: { selfie?: string }) {
    const booking = await this.ownBooking(userId, bookingId);
    const state = this.evaluate(booking);
    if (!state.statusAllows) throw AppError.badRequest(`A ${booking.status} booking cannot be checked in`);
    if (!state.open) throw AppError.badRequest('Online check-in opens 72 hours before pickup');
    if (state.requirements.some((r) => !r.ok)) {
      throw AppError.badRequest('Upload a valid driving licence (both sides) and an ID card or passport first');
    }
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(payload?.selfie))) {
      throw AppError.badRequest('Please take a selfie photo');
    }
    const selfie = storeCustomerDocument(payload.selfie!);

    const firstTime = !booking.checkedInAt;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkedInAt: new Date(), checkInSelfieUrl: selfie.url },
    });
    if (firstTime) {
      await prisma.customerNotification.create({
        data: {
          customerId: booking.customer.id,
          category: 'BOOKING',
          title: 'Online check-in complete',
          message: `You are checked in for booking #${booking.bookingNumber}. Show your QR code at pickup.`,
          actionUrl: `/customer/bookings/${booking.id}/check-in`,
        },
      });
      void this.emailConfirmation(booking).catch((err) =>
        console.error('[email] check-in confirmation failed:', err instanceof Error ? err.message : err)
      );
    }
    return this.status(userId, bookingId);
  }

  /** The QR code of a checked-in booking, as a PNG. */
  static async qrPng(userId: string, bookingId: string): Promise<Buffer> {
    const booking = await this.ownBooking(userId, bookingId);
    if (!booking.checkedInAt) throw AppError.badRequest('Complete the online check-in first');
    return QRCode.toBuffer(this.handoverUrl(booking.id), { width: 360, margin: 2, errorCorrectionLevel: 'M' });
  }

  private static async emailConfirmation(booking: Awaited<ReturnType<typeof CheckInService.ownBooking>>) {
    const qr = await QRCode.toBuffer(this.handoverUrl(booking.id), { width: 360, margin: 2, errorCorrectionLevel: 'M' });
    const pickup = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(
      booking.pickupDateTime
    );
    await EmailService.send({
      to: booking.customer.email,
      subject: `You are checked in: booking #${booking.bookingNumber}`,
      paragraphs: [
        `Hi ${booking.customer.fullName.split(' ')[0] || booking.customer.fullName},`,
        `Your online check-in for the ${booking.vehicle.year} ${booking.vehicle.brand} ${booking.vehicle.model} on ${pickup} is complete.`,
        'At pickup, show the attached QR code to our staff (or the delivery driver). They compare you with your selfie and hand over the keys, no paperwork needed.',
      ],
      action: { label: 'Open my check-in', url: `${env.CORS.ORIGIN}/customer/bookings/${booking.id}/check-in` },
      footer: 'You receive this email because you have a booking with Finovo Car Rental.',
      attachments: [{ filename: `Finovo-check-in-${booking.bookingNumber}.png`, content: qr, contentType: 'image/png' }],
    });
  }
}
