import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { SecurityAuditLog } from '../../features/audit-logs/api/auditLogApi';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface AdminUsersResponse {
  success: boolean;
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  role?: string;
  password?: string;
}

export const adminApi = {
  // List users with search and pagination
  listUsers: async (params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<AdminUsersResponse> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USERS, { params });
  },

  // Get user by ID
  getUserById: async (id: string): Promise<{ success: boolean; user: AdminUser }> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USER_BY_ID(id));
  },

  // Create user
  createUser: async (data: CreateUserInput): Promise<{ success: boolean; message: string; user: AdminUser }> => {
    return apiClient.post(API_ENDPOINTS.ADMIN.USERS, data);
  },

  // Update user
  updateUser: async (id: string, data: UpdateUserInput): Promise<{ success: boolean; message: string; user: AdminUser }> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.USER_BY_ID(id), data);
  },

  // Delete user
  deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.ADMIN.USER_BY_ID(id));
  },

  // List security audit logs
  listAuditLogs: async (): Promise<{ success: boolean; logs: SecurityAuditLog[] }> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.AUDIT_LOGS);
  },
};
