import { authClient } from '../../auth/api/authClient';

export interface EmployeeUser {
  id: string;
  email: string;
  fullName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  isEmailVerified: boolean;
  createdAt: string;
  roles: string[];
}

export const employeeApi = {
  async getEmployees(): Promise<{ success: boolean; users: EmployeeUser[] }> {
    return authClient.request<{ success: boolean; users: EmployeeUser[] }>('/admin/users');
  },
};
