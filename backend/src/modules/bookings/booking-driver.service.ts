import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { storeCustomerDocument } from '../customers/customer-portal.service';
import { hasAdditionalDriver } from './booking-approval.service';

/** One additional driver per booking with the "Additional driver" add-on. */
const MAX_DRIVERS = 1;
/** Drivers can be changed until the car is handed over. */
const EDITABLE_STATUSES = ['PENDING', 'REQUIRES_REVIEW', 'CONFIRMED', 'READY_FOR_PICKUP'];
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,/;

export interface AddDriverDTO {
  fullName?: unknown;
  phone?: unknown;
  licenceNumber?: unknown;
  licenceExpiresAt?: unknown;
  licenceFront?: unknown;
  licenceBack?: unknown;
}

function text(raw: unknown, min: number, max: number, field: string, required = true): string | null {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) {
    if (required) throw AppError.badRequest(`Enter the ${field}`);
    return null;
  }
  if (value.length < min || value.length > max) throw AppError.badRequest(`The ${field} must be ${min} to ${max} characters`);
  return value;
}

function format(d: {
  id: string;
  fullName: string;
  phone: string | null;
  licenceNumber: string;
  licenceExpiresAt: Date;
  licenceFrontUrl: string;
  licenceBackUrl: string;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
}) {
  return {
    id: d.id,
    fullName: d.fullName,
    phone: d.phone,
    licenceNumber: d.licenceNumber,
    licenceExpiresAt: d.licenceExpiresAt,
    licenceFrontUrl: d.licenceFrontUrl,
    licenceBackUrl: d.licenceBackUrl,
    status: d.status,
    rejectionReason: d.rejectionReason,
    createdAt: d.createdAt,
  };
}

/**
 * The customer adds the second driver of a booking that includes the "Additional driver" add-on: name, phone,
 * licence number and expiry, and both sides of the licence. Staff check the licence before approving the
 * booking and see it again at handover.
 */
export class BookingDriverService {
  private static async ownBooking(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { userId: true } },
        breakdownItems: { select: { lineType: true, description: true } },
        drivers: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!booking || booking.customer.userId !== userId) throw AppError.notFound('Booking not found');
    return booking;
  }

  static async list(userId: string, bookingId: string) {
    const booking = await this.ownBooking(userId, bookingId);
    const allowed = hasAdditionalDriver(booking.breakdownItems) ? MAX_DRIVERS : 0;
    return {
      allowed,
      editable: allowed > 0 && EDITABLE_STATUSES.includes(booking.status),
      drivers: booking.drivers.map(format),
    };
  }

  static async add(userId: string, bookingId: string, dto: AddDriverDTO) {
    const booking = await this.ownBooking(userId, bookingId);
    if (!hasAdditionalDriver(booking.breakdownItems)) {
      throw AppError.badRequest('This booking does not include the additional driver add-on');
    }
    if (!EDITABLE_STATUSES.includes(booking.status)) throw AppError.badRequest('Drivers can only be changed before pickup');
    if (booking.drivers.length >= MAX_DRIVERS) {
      throw AppError.badRequest('The additional driver is already added. Remove them first to add someone else.');
    }

    const fullName = text(dto.fullName, 3, 128, "driver's full name")!;
    const licenceNumber = text(dto.licenceNumber, 4, 64, 'licence number')!.toUpperCase();
    const phone = text(dto.phone, 7, 32, 'phone number', false);
    const expiresAt = new Date(String(dto.licenceExpiresAt ?? ''));
    if (Number.isNaN(expiresAt.getTime())) throw AppError.badRequest('Enter the licence expiry date');
    if (expiresAt < booking.returnDateTime) {
      throw AppError.badRequest('The licence must be valid until the car is returned');
    }
    if (!IMAGE_DATA_URL.test(String(dto.licenceFront)) || !IMAGE_DATA_URL.test(String(dto.licenceBack))) {
      throw AppError.badRequest('Add a photo of both sides of the licence');
    }

    const front = storeCustomerDocument(String(dto.licenceFront));
    const back = storeCustomerDocument(String(dto.licenceBack));
    const driver = await prisma.bookingDriver.create({
      data: {
        bookingId: booking.id,
        fullName,
        phone,
        licenceNumber,
        licenceExpiresAt: expiresAt,
        licenceFrontUrl: front.url,
        licenceBackUrl: back.url,
      },
    });
    await prisma.securityAuditLog.create({
      data: { userId, event: 'BOOKING_DRIVER_ADDED', metadata: JSON.stringify({ bookingNumber: booking.bookingNumber, driverId: driver.id }) },
    });
    return format(driver);
  }

  static async remove(userId: string, bookingId: string, driverId: string) {
    const booking = await this.ownBooking(userId, bookingId);
    if (!EDITABLE_STATUSES.includes(booking.status)) throw AppError.badRequest('Drivers can only be changed before pickup');
    const driver = booking.drivers.find((d) => d.id === driverId);
    if (!driver) throw AppError.notFound('Driver not found');
    await prisma.bookingDriver.delete({ where: { id: driver.id } });
    await prisma.securityAuditLog.create({
      data: { userId, event: 'BOOKING_DRIVER_REMOVED', metadata: JSON.stringify({ bookingNumber: booking.bookingNumber, driverId }) },
    });
    return { removed: true };
  }
}
