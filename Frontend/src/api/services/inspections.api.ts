import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  InspectionRecord,
  CreateInspectionPayload,
  DamageFinding,
} from '../../features/inspections/api/inspectionApi';

export const inspectionsApi = {
  list: async (): Promise<{ success: boolean; inspections: InspectionRecord[] }> => {
    return apiClient.get(API_ENDPOINTS.INSPECTIONS.LIST);
  },

  getById: async (id: string): Promise<{ success: boolean; inspection: InspectionRecord }> => {
    return apiClient.get(API_ENDPOINTS.INSPECTIONS.BY_ID(id));
  },

  analyze: async (payload: CreateInspectionPayload): Promise<{ success: boolean; inspection: InspectionRecord }> => {
    return apiClient.post(API_ENDPOINTS.INSPECTIONS.ANALYZE, payload);
  },

  reviewFinding: async (
    findingId: string,
    decision: 'CONFIRMED' | 'DISMISSED',
    notes?: string
  ): Promise<{ success: boolean; finding: DamageFinding }> => {
    return apiClient.patch(API_ENDPOINTS.INSPECTIONS.REVIEW_FINDING(findingId), { decision, notes });
  },
};
