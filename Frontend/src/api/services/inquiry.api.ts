import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'REPLIED' | 'CLOSED';
  replyMessage?: string | null;
  repliedAt?: string | null;
  repliedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface InquiriesListResponse {
  success: boolean;
  inquiries: Inquiry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const inquiryApi = {
  // Public inquiry submission from Contact Us page
  submitInquiry: async (data: CreateInquiryInput): Promise<{ success: boolean; message: string; inquiry: Inquiry }> => {
    return apiClient.post(API_ENDPOINTS.INQUIRIES.SUBMIT, data);
  },

  // Admin list inquiries
  listInquiries: async (params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<InquiriesListResponse> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.INQUIRIES, { params });
  },

  // Admin get single inquiry
  getInquiry: async (id: string): Promise<{ success: boolean; inquiry: Inquiry }> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.INQUIRY_BY_ID(id));
  },

  // Admin update inquiry status
  updateStatus: async (id: string, status: Inquiry['status']): Promise<{ success: boolean; message: string; inquiry: Inquiry }> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.INQUIRY_STATUS(id), { status });
  },

  // Admin reply to inquiry
  replyToInquiry: async (id: string, message: string): Promise<{ success: boolean; message: string; inquiry: Inquiry }> => {
    return apiClient.post(API_ENDPOINTS.ADMIN.INQUIRY_REPLY(id), { message });
  },

  // Admin delete inquiry
  deleteInquiry: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.ADMIN.INQUIRY_BY_ID(id));
  },
};
