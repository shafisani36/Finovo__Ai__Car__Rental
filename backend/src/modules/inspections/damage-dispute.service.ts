import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { RefundService } from '../payments/refund.service';

/** A customer can dispute a damage charge up to this many days after it was raised. */
export const DISPUTE_WINDOW_DAYS = 14;

/** Charges a customer may still dispute. */
const DISPUTABLE_STATUSES = ['PROPOSED', 'EVIDENCE_REVIEW', 'APPROVED', 'CUSTOMER_NOTIFIED', 'SETTLED'];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export class DamageDisputeService {
  /** The customer explains why a damage charge is wrong; staff then review it. */
  static async open(chargeId: string, userId: string, rawReason: unknown) {
    const reason = String(rawReason ?? '').trim();
    if (reason.length < 10) throw AppError.badRequest('Please explain the reason in at least 10 characters');
    if (reason.length > 1000) throw AppError.badRequest('The reason must be at most 1000 characters');

    const charge = await prisma.damage_charges.findUnique({
      where: { id: chargeId },
      include: { bookings: { select: { id: true, bookingNumber: true, customerId: true, customer: { select: { userId: true } } } } },
    });
    if (!charge || charge.bookings.customer.userId !== userId) throw AppError.notFound('Damage charge not found');
    if (charge.status === 'DISPUTED') throw AppError.conflict('You have already disputed this charge. Our team is reviewing it.');
    if (charge.disputeResolvedAt) throw AppError.badRequest('This charge was already reviewed after a dispute');
    if (!DISPUTABLE_STATUSES.includes(charge.status)) throw AppError.badRequest('This charge can no longer be disputed');
    const ageDays = (Date.now() - charge.createdAt.getTime()) / 86_400_000;
    if (ageDays > DISPUTE_WINDOW_DAYS) {
      throw AppError.badRequest(`Charges can be disputed within ${DISPUTE_WINDOW_DAYS} days. Please contact support.`);
    }

    // Guarded update keeps two parallel requests from both opening a dispute
    const updated = await prisma.damage_charges.updateMany({
      where: { id: chargeId, status: charge.status },
      data: {
        status: 'DISPUTED',
        disputeNotes: `${charge.status}|${reason}`,
        disputeOpenedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (updated.count === 0) throw AppError.conflict('This charge was changed a moment ago. Please refresh and try again.');

    await prisma.securityAuditLog.create({
      data: {
        userId,
        event: 'DAMAGE_CHARGE_DISPUTED',
        metadata: JSON.stringify({ bookingNumber: charge.bookings.bookingNumber, chargeId, amount: Number(charge.proposedAmount) }),
      },
    });
    return { status: 'DISPUTED' as const };
  }

  /**
   * Staff decision on a dispute. Accepting waives the charge (and refunds it if it was already taken);
   * rejecting keeps the charge. The customer is told the outcome and the reason.
   */
  static async resolve(chargeId: string, staffUserId: string | undefined, decision: unknown, rawResponse: unknown) {
    if (decision !== 'ACCEPT' && decision !== 'REJECT') throw AppError.badRequest('decision must be ACCEPT or REJECT');
    const response = String(rawResponse ?? '').trim();
    if (response.length < 5) throw AppError.badRequest('Write a short answer for the customer');
    if (response.length > 1000) throw AppError.badRequest('The answer must be at most 1000 characters');

    const charge = await prisma.damage_charges.findUnique({
      where: { id: chargeId },
      include: { bookings: { select: { id: true, bookingNumber: true, customerId: true, currency: true } } },
    });
    if (!charge) throw AppError.notFound('Damage charge not found');
    if (charge.status !== 'DISPUTED') throw AppError.badRequest('This charge has no open dispute');

    const previousStatus = (charge.disputeNotes || '').split('|')[0];
    const wasSettled = previousStatus === 'SETTLED';
    const amount = roundMoney(Number(charge.approvedAmount) || Number(charge.proposedAmount));
    const accepted = decision === 'ACCEPT';

    const claimed = await prisma.damage_charges.updateMany({
      where: { id: chargeId, status: 'DISPUTED' },
      data: accepted
        ? { status: 'REJECTED', approvedAmount: 0, approvedById: staffUserId || null, approvedAt: new Date() }
        : {
            status: wasSettled ? 'SETTLED' : 'APPROVED',
            approvedAmount: charge.proposedAmount,
            approvedById: staffUserId || null,
            approvedAt: new Date(),
          },
    });
    if (claimed.count === 0) throw AppError.conflict('This dispute was resolved a moment ago');
    await prisma.damage_charges.update({
      where: { id: chargeId },
      data: { disputeResolvedAt: new Date(), disputeResponse: response, updatedAt: new Date() },
    });

    let refund = null;
    if (accepted && wasSettled && amount > 0) {
      refund = await RefundService.refundBooking(
        charge.bookingId,
        amount,
        `Damage charge waived after dispute (booking ${charge.bookings.bookingNumber})`
      );
    }

    await prisma.customerNotification.create({
      data: {
        customerId: charge.bookings.customerId,
        category: 'INSPECTION',
        title: accepted ? 'Dispute accepted' : 'Dispute reviewed',
        message: accepted
          ? `We removed the charge "${charge.description}" from booking #${charge.bookings.bookingNumber}. ${response}`
          : `The charge "${charge.description}" on booking #${charge.bookings.bookingNumber} stays. ${response}`,
        actionUrl: `/customer/bookings/${charge.bookingId}/inspection`,
      },
    });

    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId || null,
        event: accepted ? 'DAMAGE_DISPUTE_ACCEPTED' : 'DAMAGE_DISPUTE_REJECTED',
        metadata: JSON.stringify({ bookingNumber: charge.bookings.bookingNumber, chargeId, amount, refund }),
      },
    });

    return { decision, refund };
  }

  /** Open disputes first, then the most recently resolved ones. */
  static async list() {
    const charges = await prisma.damage_charges.findMany({
      where: { disputeOpenedAt: { not: null } },
      include: {
        bookings: {
          select: {
            id: true,
            bookingNumber: true,
            customer: { select: { fullName: true, email: true } },
            vehicle: { select: { brand: true, model: true, registrationNumber: true } },
            // The customer's own photo checks, to weigh against the staff reports
            customerScans: {
              select: { id: true, customerStage: true, overallScore: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { disputeOpenedAt: 'desc' },
      take: 200,
    });
    return charges
      .map((c) => ({
        id: c.id,
        bookingId: c.bookingId,
        bookingNumber: c.bookings.bookingNumber,
        customerName: c.bookings.customer.fullName,
        customerEmail: c.bookings.customer.email,
        vehicle: `${c.bookings.vehicle.brand} ${c.bookings.vehicle.model}`,
        registrationNumber: c.bookings.vehicle.registrationNumber,
        description: c.description,
        amount: Number(c.proposedAmount),
        currency: c.currency,
        status: c.status,
        reason: DamageDisputeService.reasonOf(c.disputeNotes),
        response: c.disputeResponse,
        openedAt: c.disputeOpenedAt,
        resolvedAt: c.disputeResolvedAt,
        customerScans: c.bookings.customerScans.map((scan) => ({
          id: scan.id,
          stage: scan.customerStage,
          // No score when the AI could not check the customer's photos
          scoreOutOf10: scan.overallScore == null ? null : Math.round(scan.overallScore) / 10,
          createdAt: scan.createdAt,
        })),
      }))
      .sort((a, b) => Number(a.status !== 'DISPUTED') - Number(b.status !== 'DISPUTED'));
  }

  /** The customer's reason, without the status saved in front of it. */
  static reasonOf(disputeNotes: string | null): string | null {
    if (!disputeNotes) return null;
    const i = disputeNotes.indexOf('|');
    return i >= 0 ? disputeNotes.slice(i + 1) : disputeNotes;
  }
}
