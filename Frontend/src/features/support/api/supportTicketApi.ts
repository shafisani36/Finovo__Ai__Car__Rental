import { apiClient } from '../../../api/client';

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface TicketCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: TicketCustomer;
  messageCount: number;
  lastMessage: { senderType: string; message: string; createdAt: string } | null;
}

export interface TicketMessage {
  id: string;
  senderType: 'CUSTOMER' | 'STAFF' | string;
  senderName: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface TicketDetail extends Omit<TicketSummary, 'messageCount' | 'lastMessage'> {
  messages: TicketMessage[];
  booking: { id: string; bookingNumber: string; status: string } | null;
}

type TicketResponse = { success: boolean; ticket: TicketDetail };

/** Staff inbox of customer support tickets */
export const supportTicketApi = {
  list(params: { status?: TicketStatus | ''; search?: string; page?: number }) {
    return apiClient.get<{
      success: boolean;
      tickets: TicketSummary[];
      counts: Record<TicketStatus, number>;
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>('/support-tickets', { params });
  },
  get(id: string) {
    return apiClient.get<TicketResponse>(`/support-tickets/${id}`);
  },
  reply(id: string, message: string, status: Exclude<TicketStatus, 'OPEN'>) {
    return apiClient.post<TicketResponse>(`/support-tickets/${id}/reply`, { message, status });
  },
  update(id: string, changes: { status?: TicketStatus; priority?: TicketPriority }) {
    return apiClient.patch<TicketResponse>(`/support-tickets/${id}`, changes);
  },
};
