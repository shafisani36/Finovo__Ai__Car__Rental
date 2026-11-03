import { authClient } from '../../auth/api/authClient';

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    vehicles: number;
  };
}

export interface CreateBranchPayload {
  name: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: string;
}

export const branchApi = {
  async getBranches(): Promise<{ success: boolean; branches: Branch[] }> {
    return authClient.request<{ success: boolean; branches: Branch[] }>('/branches');
  },

  async getBranchById(id: string): Promise<{ success: boolean; branch: Branch }> {
    return authClient.request<{ success: boolean; branch: Branch }>(`/branches/${id}`);
  },

  async createBranch(payload: CreateBranchPayload): Promise<{ success: boolean; branch: Branch }> {
    return authClient.request<{ success: boolean; branch: Branch }>('/branches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
