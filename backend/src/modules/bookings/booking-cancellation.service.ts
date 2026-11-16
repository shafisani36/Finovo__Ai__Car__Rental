import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { RefundService } from '../payments/refund.service';
import { cancellationTerms, CUSTOMER_CANCELLABLE_STATUSES } from './cancellation-policy';
import { MessagingService } from '../notifications/messaging.service';

export class BookingCancellationService {
  /** What the customer would get back if the booking were cancelled now. */
  static async preview(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');
    const paid = await RefundService.refundableAmount(booking.id);
    const terms = cancellationTerms(booking, paid);
    return {
      cancellable: CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status),
      currency: booking.currency,
      ...terms,
    };
  }

  /**
   * Cancels a booking under the cancellation policy and refunds what is due.
   * The status change is made first with a guarded update, so two parallel requests cannot refund twice.
   */
  static async cancel(bookingId: string, opts: { reason?: string; actorUserId?: string | null; by: 'CUSTOMER' | 'STAFF' }) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status)) {
      throw AppError.badRequest('This booking can no longer be cancelled online. Please contact support.');
    }

    const paid = await RefundService.refundableAmount(booking.id);
    const terms = cancellationTerms(booking, paid);
    const label = opts.by === 'CUSTOMER' ? 'Customer cancellation' : 'Cancelled by staff';
    const reasonText = (opts.reason || '').trim().slice(0, 500);

    const claimed = await prisma.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationFee: terms.fee,
        refundAmount: terms.refund,
        settlementStatus: terms.refund > 0 ? 'REFUND_PENDING' : booking.settlementStatus,
        notes: `${booking.notes ? booking.notes + '\n' : ''}[${label}]: ${reasonText || 'No reason given'}`,
      },
    });
    if (claimed.count === 0) {
      throw AppError.conflict('This booking was changed a moment ago. Please refresh and try again.');
    }

    const outcome = await RefundService.refundBooking(booking.id, terms.refund, `${label} of booking ${booking.bookingNumber}`);
    const settlementStatus =
      terms.refund <= 0
        ? booking.settlementStatus
        : outcome.failed > 0 || outcome.pendingManual > 0
          ? 'REFUND_PENDING'
          : 'REFUNDED';
    await prisma.booking.update({ where: { id: booking.id }, data: { settlementStatus } });

    await prisma.customerNotification.create({
      data: {
        customerId: booking.customerId,
        category: 'BOOKING',
        title: 'Booking cancelled',
        message:
          terms.refund > 0
            ? `Booking #${booking.bookingNumber} was cancelled. Refund: ${booking.currency} ${terms.refund.toFixed(2)}${
                terms.fee > 0 ? ` (late cancellation fee ${booking.currency} ${terms.fee.toFixed(2)})` : ''
              }.`
            : `Booking #${booking.bookingNumber} was cancelled.`,
        actionUrl: `/customer/bookings/${booking.id}`,
      },
    });

    await prisma.securityAuditLog.create({
      data: {
        userId: opts.actorUserId || null,
        event: 'BOOKING_CANCELLED',
        metadata: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          by: opts.by,
          fee: terms.fee,
          refund: terms.refund,
          refundedOnline: outcome.refundedOnline,
          refundPendingManual: outcome.pendingManual,
          refundFailed: outcome.failed,
        }),
      },
    });

    void MessagingService.notifyBooking(booking.id, 'BOOKING_CANCELLED', { refund: terms.refund });

    return {
      booking: await prisma.booking.findUnique({ where: { id: booking.id } }),
      terms,
      refund: outcome,
    };
  }
}
