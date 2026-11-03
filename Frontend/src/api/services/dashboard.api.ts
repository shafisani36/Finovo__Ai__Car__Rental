import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { DashboardOverviewResponse } from '../../features/dashboard/api/dashboardApi';

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const res = await apiClient.get<{ success: boolean; data: DashboardOverviewResponse }>(
      API_ENDPOINTS.DASHBOARD.OVERVIEW
    );
    return res.data;
  },
};
