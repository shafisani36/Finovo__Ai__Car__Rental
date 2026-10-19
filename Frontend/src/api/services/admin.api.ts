import { apiClient } from '../client';import { API_ENDPOINTS } from '../endpoints';
import type { EmployeeUser } from '../../features/employees/api/employeeApi';
import type { SecurityAuditLog } from '../../features/audit-logs/api/auditLogApi';

export const adminApi = {
  listUsers: async (): Promise<{ success: boolean; users: EmployeeUser[] }> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USERS);
  },

  listAuditLogs: async (): Promise<{ success: boolean; logs: SecurityAuditLog[] }> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.AUDIT_LOGS);
  },
};
