import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { EmailService } from '../../infrastructure/email/email.service';
import { env } from '../../config/env.config';
import { AppError } from '../../shared/errors/app-error';
import { staffRecipients } from '../notifications/booking-emails';

/** OPEN = the customer is waiting for us; IN_PROGRESS = we answered and wait for the customer. */
export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const MAX_MESSAGE = 5000;
const PAGE_SIZE = 20;

const STAFF_FOOTER = 'You receive this email because you are a Finovo Car Rental staff member.';

async function sendSafely(email: Parameters<typeof EmailService.send>[0], what: string): Promise<void> {
  try {
    await EmailService.send(email);
  } catch (err) {
    console.error(`[email] ${what} failed:`, err instanceof Error ? err.message : err);
  }
}

function excerpt(text: string, max = 600): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

export interface TicketListQuery {
  status?: unknown;
  search?: unknown;
  page?: unknown;
}

/**
 * Staff side of the customer support tickets: an inbox of tickets, the conversation, replies, and status
 * changes. Customers are emailed when staff reply; staff are emailed when a ticket is opened or the customer
 * writes again.
 */
export class SupportTicketService {
  static async list(query: TicketListQuery) {
    const status = String(query.status ?? '').toUpperCase();
    const search = String(query.search ?? '').trim().slice(0, 100);
    const page = Math.max(1, Math.floor(Number(query.page) || 1));

    const where: Prisma.SupportTicketWhereInput = {};
    if ((TICKET_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const [tickets, total, grouped] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        // Customers waiting for an answer first, then the most recently active
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { senderType: true, message: true, createdAt: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const g of grouped) counts[g.status] = g._count._all;

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        bookingId: t.bookingId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        customer: t.customer,
        messageCount: t._count.messages,
        lastMessage: t.messages[0] ? { ...t.messages[0], message: excerpt(t.messages[0].message, 160) } : null,
      })),
      counts,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    };
  }

  static async get(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw AppError.notFound('Ticket not found');
    const booking = ticket.bookingId
      ? await prisma.booking.findUnique({ where: { id: ticket.bookingId }, select: { id: true, bookingNumber: true, status: true } })
      : null;
    return { ...ticket, booking };
  }

  /** Staff answer: the customer gets an email and an app notification. */
  static async reply(ticketId: string, staffUserId: string | undefined, rawMessage: unknown, rawStatus?: unknown) {
    const message = String(rawMessage ?? '').trim();
    if (message.length < 2) throw AppError.badRequest('Write a reply');
    if (message.length > MAX_MESSAGE) throw AppError.badRequest(`The reply must be at most ${MAX_MESSAGE} characters`);
    const nextStatus = rawStatus ? String(rawStatus).toUpperCase() : 'IN_PROGRESS';
    if (!(TICKET_STATUSES as readonly string[]).includes(nextStatus) || nextStatus === 'OPEN') {
      throw AppError.badRequest('status must be IN_PROGRESS, RESOLVED or CLOSED');
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { customer: true } });
    if (!ticket) throw AppError.notFound('Ticket not found');
    const staff = staffUserId ? await prisma.user.findUnique({ where: { id: staffUserId }, select: { fullName: true } }) : null;
    const senderName = `${staff?.fullName || 'Finovo'} (Finovo support)`.slice(0, 128);

    await prisma.$transaction([
      prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderType: 'STAFF', senderName, message } }),
      prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: nextStatus } }),
      prisma.customerNotification.create({
        data: {
          customerId: ticket.customerId,
          category: 'ACCOUNT',
          title: `Reply to your ticket #${ticket.ticketNumber}`,
          message: excerpt(message, 240),
          actionUrl: '/customer/support',
        },
      }),
    ]);
    await prisma.securityAuditLog.create({
      data: { userId: staffUserId || null, event: 'SUPPORT_TICKET_REPLIED', metadata: JSON.stringify({ ticketNumber: ticket.ticketNumber, status: nextStatus }) },
    });

    void sendSafely(
      {
        to: ticket.customer.email,
        subject: `Re: ${ticket.subject} [#${ticket.ticketNumber}]`,
        paragraphs: [
          `Hi ${ticket.customer.fullName.split(' ')[0] || ticket.customer.fullName},`,
          'Our support team replied to your ticket:',
          message,
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? 'We have marked this ticket as solved. If you still need help, simply reply in your account and it opens again.'
            : 'You can reply from your account.',
        ],
        action: { label: 'Open my tickets', url: `${env.CORS.ORIGIN}/customer/support` },
        footer: 'You receive this email because you contacted Finovo Car Rental support.',
      },
      'ticket reply email to customer'
    );
    return this.get(ticket.id);
  }

  static async update(ticketId: string, staffUserId: string | undefined, body: { status?: unknown; priority?: unknown }) {
    const data: Prisma.SupportTicketUpdateInput = {};
    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (!(TICKET_STATUSES as readonly string[]).includes(status)) throw AppError.badRequest('Unknown status');
      data.status = status;
    }
    if (body.priority !== undefined) {
      const priority = String(body.priority).toUpperCase();
      if (!(TICKET_PRIORITIES as readonly string[]).includes(priority)) throw AppError.badRequest('Unknown priority');
      data.priority = priority;
    }
    if (Object.keys(data).length === 0) throw AppError.badRequest('Nothing to change');
    const exists = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { ticketNumber: true } });
    if (!exists) throw AppError.notFound('Ticket not found');
    await prisma.supportTicket.update({ where: { id: ticketId }, data });
    await prisma.securityAuditLog.create({
      data: { userId: staffUserId || null, event: 'SUPPORT_TICKET_UPDATED', metadata: JSON.stringify({ ticketNumber: exists.ticketNumber, ...data }) },
    });
    return this.get(ticketId);
  }

  /** Tells staff that a customer opened a ticket or wrote again. Never throws. */
  static async notifyStaff(ticketId: string, kind: 'NEW' | 'REPLY'): Promise<void> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { customer: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!ticket) return;
      const to = await staffRecipients();
      if (to.length === 0) return;
      await sendSafely(
        {
          to,
          subject:
            kind === 'NEW'
              ? `New support ticket #${ticket.ticketNumber}: ${ticket.subject}`
              : `Customer replied on ticket #${ticket.ticketNumber}: ${ticket.subject}`,
          paragraphs: [
            kind === 'NEW'
              ? `${ticket.customer.fullName} opened a support ticket.`
              : `${ticket.customer.fullName} wrote again on a support ticket.`,
            excerpt(ticket.messages[0]?.message ?? ''),
          ],
          details: [
            { label: 'Customer', value: `${ticket.customer.fullName} (${ticket.customer.email})` },
            { label: 'Topic', value: ticket.category },
            { label: 'Priority', value: ticket.priority },
          ],
          action: { label: 'Answer the ticket', url: `${env.CORS.ORIGIN}/admin/support?ticket=${ticket.id}` },
          footer: STAFF_FOOTER,
        },
        'ticket email to staff'
      );
    } catch (err) {
      console.error('[support] staff notification failed:', err instanceof Error ? err.message : err);
    }
  }
}
