import { authClient } from '../../auth/api/authClient';

export interface SecurityAuditLog {
  id: string;
  userId?: string;
  event: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

export const auditLogApi = {
  async getAuditLogs(): Promise<{ success: boolean; logs: SecurityAuditLog[] }> {
    return authClient.request<{ success: boolean; logs: SecurityAuditLog[] }>('/admin/audit-logs');
  },
};
