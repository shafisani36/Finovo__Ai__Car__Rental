import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { Branch, CreateBranchPayload } from '../../features/branches/api/branchApi';

export const branchesApi = {
  list: async (): Promise<{ success: boolean; branches: Branch[] }> => {
    return apiClient.get(API_ENDPOINTS.BRANCHES.LIST);
  },

  getById: async (id: string): Promise<{ success: boolean; branch: Branch }> => {
    return apiClient.get(API_ENDPOINTS.BRANCHES.BY_ID(id));
  },

  create: async (data: CreateBranchPayload): Promise<{ success: boolean; branch: Branch }> => {
    return apiClient.post(API_ENDPOINTS.BRANCHES.CREATE, data);
  },
};
