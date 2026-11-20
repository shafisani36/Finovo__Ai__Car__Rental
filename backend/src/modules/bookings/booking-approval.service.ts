import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AvailabilityAlertService } from './availability-alert.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { MessagingService } from '../notifications/messaging.service';
import { RefundService } from '../payments/refund.service';
import { BOOKING_ADDON_CATALOG } from './booking.service';

/** Online bookings wait in this status, after payment, until staff approve or reject them. */
export const AWAITING_APPROVAL_STATUS = 'REQUIRES_REVIEW';

const LICENCE_TYPES = ['DRIVER_LICENSE_FRONT', 'DRIVER_LICENSE_BACK'];
const IDENTITY_TYPES = ['NATIONAL_ID', 'PASSPORT'];
const DOCUMENT_TYPES = [...LICENCE_TYPES, ...IDENTITY_TYPES];
const DECISIONS = ['VERIFIED', 'REJECTED'] as const;
type Decision = (typeof DECISIONS)[number];

export type ApprovalProblem =
  | 'LICENCE_MISSING'
  | 'LICENCE_NOT_VERIFIED'
  | 'LICENCE_EXPIRES_BEFORE_RETURN'
  | 'ID_MISSING'
  | 'ID_NOT_VERIFIED'
  | 'DRIVER_MISSING'
  | 'DRIVER_NOT_VERIFIED';

/** True when the booking includes the paid "Additional driver" add-on. */
export function hasAdditionalDriver(lines: Array<{ lineType: string; description: string }>): boolean {
  return lines.some((l) => l.lineType === 'addon' && l.description === BOOKING_ADDON_CATALOG.EXTRA_DRIVER.description);
}

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cleanReason(raw: unknown, min: number, max: number, what: string): string {
  const text = String(raw ?? '').trim();
  if (text.length < min) throw AppError.badRequest(`Write the ${what} (at least ${min} characters)`);
  if (text.length > max) throw AppError.badRequest(`The ${what} must be at most ${max} characters`);
  return text;
}

const REVIEW_INCLUDE = {
  customer: {
    include: {
      documents: { where: { documentType: { in: DOCUMENT_TYPES } }, orderBy: { createdAt: 'desc' as const } },
      user: { select: { createdAt: true, isEmailVerified: true } },
    },
  },
  vehicle: { select: { id: true, brand: true, model: true, year: true, registrationNumber: true, primaryImageUrl: true } },
  pickupBranch: { select: { name: true } },
  breakdownItems: { select: { lineType: true, description: true } },
  drivers: { orderBy: { createdAt: 'asc' as const } },
} as const;

/**
 * Staff approval of online bookings: after paying, a booking waits until staff have checked the customer's
 * driving licence and ID (and the additional driver's licence when that add-on was booked). Approving confirms
 * the booking; rejecting refunds everything that was paid.
 */
export class BookingApprovalService {
  private static async load(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: REVIEW_INCLUDE });
    if (!booking) throw AppError.notFound('Booking not found');
    return booking;
  }

  /** Latest upload of each document type: older copies were replaced by the customer. */
  private static latestDocuments(docs: Array<{ documentType: string; createdAt: Date }>) {
    const seen = new Set<string>();
    return docs.filter((d) => (seen.has(d.documentType) ? false : (seen.add(d.documentType), true)));
  }

  /** What still stops the approval; empty when the booking can be approved. */
  private static problems(booking: Awaited<ReturnType<typeof BookingApprovalService.load>>): ApprovalProblem[] {
    const docs = this.latestDocuments(booking.customer.documents) as typeof booking.customer.documents;
    const problems: ApprovalProblem[] = [];
    const licence = LICENCE_TYPES.map((t) => docs.find((d) => d.documentType === t));
    if (licence.some((d) => !d)) problems.push('LICENCE_MISSING');
    else if (licence.some((d) => d!.verificationStatus !== 'VERIFIED')) problems.push('LICENCE_NOT_VERIFIED');
    if (licence.some((d) => d?.expiresAt && d.expiresAt < booking.returnDateTime)) problems.push('LICENCE_EXPIRES_BEFORE_RETURN');
    const ids = docs.filter((d) => IDENTITY_TYPES.includes(d.documentType));
    if (ids.length === 0) problems.push('ID_MISSING');
    else if (!ids.some((d) => d.verificationStatus === 'VERIFIED')) problems.push('ID_NOT_VERIFIED');
    if (hasAdditionalDriver(booking.breakdownItems)) {
      if (booking.drivers.length === 0) problems.push('DRIVER_MISSING');
      else if (booking.drivers.some((d) => d.status !== 'VERIFIED')) problems.push('DRIVER_NOT_VERIFIED');
    }
    return problems;
  }

  /** Everything staff need to decide: the customer profile, documents, drivers, history and money owed. */
  static async review(bookingId: string) {
    const booking = await this.load(bookingId);
    const customer = booking.customer;
    const [history, unpaidFines] = await Promise.all([
      prisma.booking.groupBy({ by: ['status'], where: { customerId: customer.id, id: { not: booking.id } }, _count: { _all: true } }),
      prisma.trafficFine.aggregate({
        where: { customerId: customer.id, status: { in: ['CHARGED', 'DISPUTED'] } },
        _sum: { fineAmount: true, adminFee: true },
        _count: { _all: true },
      }),
    ]);
    const count = (statuses: string[]) => history.filter((h) => statuses.includes(h.status)).reduce((s, h) => s + h._count._all, 0);
    const docs = this.latestDocuments(customer.documents) as typeof customer.documents;

    return {
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        pickupDateTime: booking.pickupDateTime,
        returnDateTime: booking.returnDateTime,
        totalAmount: Number(booking.totalAmount),
        depositAmount: Number(booking.depositAmount),
        currency: booking.currency,
        deliveryAddress: booking.deliveryAddress,
        pickupBranch: booking.pickupBranch.name,
        createdAt: booking.createdAt,
        approvedAt: booking.approvedAt,
        rejectionReason: booking.rejectionReason,
        additionalDriverBooked: hasAdditionalDriver(booking.breakdownItems),
        vehicle: {
          name: `${booking.vehicle.year} ${booking.vehicle.brand} ${booking.vehicle.model}`,
          registrationNumber: booking.vehicle.registrationNumber,
          imageUrl: booking.vehicle.primaryImageUrl,
        },
      },
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        licenseNumber: customer.driverLicenseNumber,
        licenseExpiry: customer.licenseExpiryDate,
        memberSince: customer.user?.createdAt ?? customer.createdAt,
        emailVerified: Boolean(customer.user?.isEmailVerified),
        completedRentals: count(['COMPLETED']),
        cancelledBookings: count(['CANCELLED']),
        rejectedBookings: count(['REJECTED']),
        unpaidFines: {
          count: unpaidFines._count._all,
          amount: Number(unpaidFines._sum.fineAmount ?? 0) + Number(unpaidFines._sum.adminFee ?? 0),
        },
      },
      documents: docs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        fileUrl: d.fileUrl,
        verificationStatus: d.verificationStatus,
        rejectionReason: d.rejectionReason,
        expiresAt: d.expiresAt,
        expiresBeforeReturn: Boolean(d.expiresAt && d.expiresAt < booking.returnDateTime),
        uploadedAt: d.createdAt,
        verifiedAt: d.verifiedAt,
      })),
      drivers: booking.drivers.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        phone: d.phone,
        licenceNumber: d.licenceNumber,
        licenceExpiresAt: d.licenceExpiresAt,
        expiresBeforeReturn: d.licenceExpiresAt < booking.returnDateTime,
        licenceFrontUrl: d.licenceFrontUrl,
        licenceBackUrl: d.licenceBackUrl,
        status: d.status,
        rejectionReason: d.rejectionReason,
      })),
      problems: this.problems(booking),
      canDecide: booking.status === AWAITING_APPROVAL_STATUS,
    };
  }

  private static staffName(userId?: string) {
    return userId ? prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } }) : null;
  }

  /** Staff mark one of the customer's documents as checked, or reject it with a reason the customer sees. */
  static async verifyDocument(documentId: string, staffUserId: string | undefined, rawDecision: unknown, rawReason: unknown) {
    const decision = String(rawDecision ?? '') as Decision;
    if (!DECISIONS.includes(decision)) throw AppError.badRequest('decision must be VERIFIED or REJECTED');
    const reason = decision === 'REJECTED' ? cleanReason(rawReason, 5, 255, 'reason for the customer') : null;
    const doc = await prisma.customerDocument.findUnique({ where: { id: documentId }, include: { customer: true } });
    if (!doc || !DOCUMENT_TYPES.includes(doc.documentType)) throw AppError.notFound('Document not found');
    const staff = await this.staffName(staffUserId);

    const updated = await prisma.customerDocument.update({
      where: { id: doc.id },
      data: {
        verificationStatus: decision,
        rejectionReason: reason,
        verifiedAt: new Date(),
        verifiedBy: (staff?.fullName || staff?.email || staffUserId || 'staff').slice(0, 128),
      },
    });
    if (decision === 'REJECTED') {
      await prisma.customerNotification.create({
        data: {
          customerId: doc.customerId,
          category: 'ACCOUNT',
          title: 'Please upload your document again',
          message: `${doc.title} was not accepted: ${reason}`,
          actionUrl: '/customer/documents',
        },
      });
    }
    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId || null,
        event: decision === 'VERIFIED' ? 'CUSTOMER_DOCUMENT_VERIFIED' : 'CUSTOMER_DOCUMENT_REJECTED',
        metadata: JSON.stringify({ documentId: doc.id, customerId: doc.customerId, documentType: doc.documentType }),
      },
    });
    return { id: updated.id, verificationStatus: updated.verificationStatus, rejectionReason: updated.rejectionReason };
  }

  /** Staff check the additional driver's licence. */
  static async verifyDriver(driverId: string, staffUserId: string | undefined, rawDecision: unknown, rawReason: unknown) {
    const decision = String(rawDecision ?? '') as Decision;
    if (!DECISIONS.includes(decision)) throw AppError.badRequest('decision must be VERIFIED or REJECTED');
    const reason = decision === 'REJECTED' ? cleanReason(rawReason, 5, 255, 'reason for the customer') : null;
    const driver = await prisma.bookingDriver.findUnique({ where: { id: driverId }, include: { booking: true } });
    if (!driver) throw AppError.notFound('Driver not found');
    if (['ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(driver.booking.status)) {
      throw AppError.badRequest('This booking can no longer be changed');
    }
    const staff = await this.staffName(staffUserId);
    const updated = await prisma.bookingDriver.update({
      where: { id: driver.id },
      data: {
        status: decision,
        rejectionReason: reason,
        verifiedAt: new Date(),
        verifiedBy: (staff?.fullName || staff?.email || staffUserId || 'staff').slice(0, 128),
      },
    });
    if (decision === 'REJECTED') {
      await prisma.customerNotification.create({
        data: {
          customerId: driver.booking.customerId,
          category: 'BOOKING',
          title: 'Additional driver not accepted',
          message: `The licence of ${driver.fullName} was not accepted: ${reason}`,
          actionUrl: `/customer/bookings/${driver.bookingId}`,
        },
      });
    }
    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId || null,
        event: decision === 'VERIFIED' ? 'BOOKING_DRIVER_VERIFIED' : 'BOOKING_DRIVER_REJECTED',
        metadata: JSON.stringify({ driverId: driver.id, bookingNumber: driver.booking.bookingNumber }),
      },
    });
    return { id: updated.id, status: updated.status, rejectionReason: updated.rejectionReason };
  }

  /** Confirms the booking once every document is checked; the customer gets the confirmation email. */
  static async approve(bookingId: string, staffUserId: string | undefined) {
    const booking = await this.load(bookingId);
    if (booking.status !== AWAITING_APPROVAL_STATUS) throw AppError.badRequest('This booking is not waiting for approval');
    const problems = this.problems(booking);
    if (problems.length > 0) {
      throw AppError.badRequest('Check and accept every document before approving the booking', { problems });
    }
    const claimed = await prisma.booking.updateMany({
      where: { id: booking.id, status: AWAITING_APPROVAL_STATUS },
      data: { status: 'CONFIRMED', approvedAt: new Date(), approvedById: staffUserId ?? null, rejectionReason: null },
    });
    if (claimed.count === 0) throw AppError.conflict('This booking was changed a moment ago. Please refresh and try again.');
    // The licence was just checked by staff
    await prisma.customer.update({ where: { id: booking.customerId }, data: { isLicenseVerified: true } });

    await prisma.customerNotification.create({
      data: {
        customerId: booking.customerId,
        category: 'BOOKING',
        title: 'Booking confirmed',
        message: `Your booking #${booking.bookingNumber} for the ${booking.vehicle.brand} ${booking.vehicle.model} is confirmed.`,
        actionUrl: `/customer/bookings/${booking.id}`,
      },
    });
    await prisma.securityAuditLog.create({
      data: { userId: staffUserId || null, event: 'BOOKING_APPROVED', metadata: JSON.stringify({ bookingNumber: booking.bookingNumber }) },
    });
    void MessagingService.notifyBooking(booking.id, 'BOOKING_CONFIRMED');
    return this.review(booking.id);
  }

  /** Turns the booking down: everything paid is refunded and the customer is told why. */
  static async reject(bookingId: string, staffUserId: string | undefined, rawReason: unknown) {
    const reason = cleanReason(rawReason, 10, 500, 'reason for the customer');
    const booking = await this.load(bookingId);
    if (booking.status !== AWAITING_APPROVAL_STATUS) throw AppError.badRequest('This booking is not waiting for approval');

    const paid = await RefundService.refundableAmount(booking.id);
    const claimed = await prisma.booking.updateMany({
      where: { id: booking.id, status: AWAITING_APPROVAL_STATUS },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        cancelledAt: new Date(),
        cancellationFee: 0,
        refundAmount: paid,
        settlementStatus: paid > 0 ? 'REFUND_PENDING' : booking.settlementStatus,
      },
    });
    if (claimed.count === 0) throw AppError.conflict('This booking was changed a moment ago. Please refresh and try again.');

    const outcome = await RefundService.refundBooking(booking.id, paid, `Booking ${booking.bookingNumber} not approved`);
    if (paid > 0) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { settlementStatus: outcome.failed > 0 || outcome.pendingManual > 0 ? 'REFUND_PENDING' : 'REFUNDED' },
      });
    }
    await prisma.customerNotification.create({
      data: {
        customerId: booking.customerId,
        category: 'BOOKING',
        title: 'Booking not approved',
        message: `Booking #${booking.bookingNumber} was not approved: ${reason}${paid > 0 ? ` Refund: ${money(paid, booking.currency)}.` : ''}`,
        actionUrl: `/customer/bookings/${booking.id}`,
      },
    });
    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId || null,
        event: 'BOOKING_REJECTED',
        metadata: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          refund: paid,
          refundedOnline: outcome.refundedOnline,
          refundPendingManual: outcome.pendingManual,
          refundFailed: outcome.failed,
        }),
      },
    });
    void MessagingService.notifyBooking(booking.id, 'BOOKING_REJECTED', { refund: paid });
    // The dates are free again for customers waiting for this car
    void AvailabilityAlertService.checkVehicle(booking.vehicleId);
    return this.review(booking.id);
  }

  /** Asks the customer to upload missing or better documents; the booking keeps waiting for approval. */
  static async requestDocuments(bookingId: string, staffUserId: string | undefined, rawNote: unknown) {
    const note = String(rawNote ?? '').trim().slice(0, 500);
    const booking = await this.load(bookingId);
    if (booking.status !== AWAITING_APPROVAL_STATUS) throw AppError.badRequest('This booking is not waiting for approval');
    // Only what the customer has to upload again: documents still waiting for a check are the staff's job
    const problems = this.problems(booking);
    const docs = this.latestDocuments(booking.customer.documents) as typeof booking.customer.documents;
    const rejected = (types: string[]) => docs.some((d) => types.includes(d.documentType) && d.verificationStatus === 'REJECTED');
    const wanted = new Set<string>();
    if (problems.includes('LICENCE_MISSING') || problems.includes('LICENCE_EXPIRES_BEFORE_RETURN') || rejected(LICENCE_TYPES)) {
      wanted.add('Driving licence, both sides (valid until the car is returned)');
    }
    const ids = docs.filter((d) => IDENTITY_TYPES.includes(d.documentType));
    if (problems.includes('ID_MISSING') || (ids.length > 0 && ids.every((d) => d.verificationStatus === 'REJECTED'))) {
      wanted.add('National ID card or passport');
    }
    if (problems.includes('DRIVER_MISSING') || booking.drivers.some((d) => d.status === 'REJECTED')) {
      wanted.add("The additional driver's details and licence (in your booking)");
    }
    if (wanted.size === 0 && !note) throw AppError.badRequest('Nothing is missing. Write a note to tell the customer what you need.');

    const items = Array.from(wanted);
    await prisma.customerNotification.create({
      data: {
        customerId: booking.customerId,
        category: 'BOOKING',
        title: 'Documents needed for your booking',
        message: `To confirm booking #${booking.bookingNumber}, please upload: ${items.join('; ') || note}`,
        actionUrl: items.some((i) => i.startsWith('The additional')) ? `/customer/bookings/${booking.id}` : '/customer/documents',
      },
    });
    try {
      await EmailService.send({
        to: booking.customer.email,
        subject: `Documents needed to confirm booking #${booking.bookingNumber}`,
        paragraphs: [
          `Hi ${booking.customer.fullName.split(' ')[0] || booking.customer.fullName},`,
          `We are checking your booking for the ${booking.vehicle.year} ${booking.vehicle.brand} ${booking.vehicle.model}. To confirm it, we need the following:`,
          ...items.map((i) => `- ${i}`),
          ...(note ? [`Note from our team: ${note}`] : []),
          'Your booking and payment stay reserved while we wait.',
        ],
        action: { label: 'Upload documents', url: `${env.CORS.ORIGIN}/customer/documents` },
        footer: 'You receive this email because you booked a car with Finovo Car Rental.',
      });
    } catch (err) {
      console.error('[email] documents request failed:', err instanceof Error ? err.message : err);
    }
    await prisma.securityAuditLog.create({
      data: { userId: staffUserId || null, event: 'BOOKING_DOCUMENTS_REQUESTED', metadata: JSON.stringify({ bookingNumber: booking.bookingNumber, items }) },
    });
    return { requested: items, note: note || null };
  }
}
