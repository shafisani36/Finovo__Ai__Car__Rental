import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { vehiclePricingApi } from './vehiclePricing.api';
import type {
  Vehicle,
  VehicleCategory,
  VehiclePhoto,
  VehiclePhotoInput,
  FleetMetrics,
  FleetDashboardStats,
  VehicleListResponse,
  VehicleFormData,
  VehicleDocument,
  VehicleMaintenance,
  VehicleDamageReport,
  VehicleOdometerLog,
  VehicleLocationLog,
  VehicleAuditLog,
  VehicleBookingItem,
} from '../../features/fleet/types/fleet.types';

export const vehiclesApi = {
  /**
   * Retrieves paginated vehicle records with filters and search
   */
  list: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    transmission?: string;
    fuelType?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<VehicleListResponse> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.LIST, { params });
  },

  /**
   * Fleet overall status counts and utilization metrics
   */
  getMetrics: async (): Promise<{ success: boolean; metrics: FleetMetrics }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.METRICS);
  },

  /**
   * 6 primary cards for fleet dashboard
   */
  getDashboardStats: async (): Promise<{ success: boolean } & FleetDashboardStats> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.DASHBOARD_STATS);
  },

  /**
   * Single vehicle full record
   */
  getById: async (id: string): Promise<{ success: boolean; vehicle: Vehicle }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.BY_ID(id));
  },

  /**
   * Vehicle categories dictionary
   */
  getCategories: async (): Promise<{ success: boolean; categories: VehicleCategory[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.CATEGORIES);
  },

  /**
   * Uploads high-res vehicle photos
   */
  uploadPhotos: async (
    photos: VehiclePhotoInput[],
    vehicleId?: string
  ): Promise<{ success: boolean; photos: VehiclePhoto[] }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.UPLOAD_IMAGES, { photos, vehicleId });
  },

  /**
   * Creates a new vehicle record
   */
  create: async (data: VehicleFormData): Promise<{ success: boolean; vehicle: Vehicle }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.CREATE, data);
  },

  /**
   * Updates an existing vehicle record
   */
  update: async (
    id: string,
    data: Partial<VehicleFormData>
  ): Promise<{ success: boolean; vehicle: Vehicle }> => {
    return apiClient.put(API_ENDPOINTS.VEHICLES.UPDATE(id), data);
  },

  /**
   * Soft-archives a vehicle
   */
  archive: async (
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; vehicle: Vehicle }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.ARCHIVE(id), { reason });
  },

  /**
   * Restores an archived vehicle to active fleet
   */
  restore: async (
    id: string
  ): Promise<{ success: boolean; message: string; vehicle: Vehicle }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.RESTORE(id));
  },

  /**
   * Live availability conflict test
   */
  checkAvailability: async (
    id: string,
    from: string,
    to: string
  ): Promise<{ success: boolean; isAvailable: boolean; reason?: string; conflictingBooking?: unknown }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.AVAILABILITY(id), { params: { from, to } });
  },

  /**
   * Safely deletes or archives a vehicle record
   */
  delete: async (
    id: string
  ): Promise<{ success: boolean; message: string; archived?: boolean }> => {
    return apiClient.delete(API_ENDPOINTS.VEHICLES.DELETE(id));
  },

  // ---------------- Sub-resources ----------------
  listDocuments: async (vehicleId: string): Promise<{ success: boolean; documents: VehicleDocument[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.DOCUMENTS(vehicleId));
  },

  createDocument: async (
    vehicleId: string,
    doc: {
      type: string;
      title: string;
      documentNumber?: string;
      fileUrl: string;
      expiresAt?: string;
      issuingAuthority?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; document: VehicleDocument }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.DOCUMENTS(vehicleId), doc);
  },

  deleteDocument: async (vehicleId: string, docId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.VEHICLES.DOCUMENT_BY_ID(vehicleId, docId));
  },

  listMaintenance: async (vehicleId: string): Promise<{ success: boolean; maintenance: VehicleMaintenance[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.MAINTENANCE(vehicleId));
  },

  createMaintenance: async (
    vehicleId: string,
    rec: {
      type: string;
      title: string;
      description?: string;
      scheduledAt: string;
      cost?: number;
      serviceProvider?: string;
      odometerAtService?: number;
    }
  ): Promise<{ success: boolean; maintenance: VehicleMaintenance }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.MAINTENANCE(vehicleId), rec);
  },

  updateMaintenance: async (
    vehicleId: string,
    maintId: string,
    rec: Partial<{
      status: string;
      completedAt: string;
      cost: number;
      notes: string;
    }>
  ): Promise<{ success: boolean; maintenance: VehicleMaintenance }> => {
    return apiClient.patch(API_ENDPOINTS.VEHICLES.MAINTENANCE_BY_ID(vehicleId, maintId), rec);
  },

  deleteMaintenance: async (vehicleId: string, maintId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.VEHICLES.MAINTENANCE_BY_ID(vehicleId, maintId));
  },

  listDamageReports: async (vehicleId: string): Promise<{ success: boolean; damageReports: VehicleDamageReport[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.DAMAGE_REPORTS(vehicleId));
  },

  createDamageReport: async (
    vehicleId: string,
    rep: {
      partName: string;
      damageType: string;
      severity: string;
      description?: string;
      photoUrl?: string;
      estimatedCost?: number;
    }
  ): Promise<{ success: boolean; damageReport: VehicleDamageReport }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.DAMAGE_REPORTS(vehicleId), rep);
  },

  updateDamageReport: async (
    vehicleId: string,
    damageId: string,
    rep: Partial<{
      status: string;
      isRepaired: boolean;
      actualCost: number;
    }>
  ): Promise<{ success: boolean; damageReport: VehicleDamageReport }> => {
    return apiClient.patch(API_ENDPOINTS.VEHICLES.DAMAGE_REPORT_BY_ID(vehicleId, damageId), rep);
  },

  deleteDamageReport: async (vehicleId: string, damageId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.VEHICLES.DAMAGE_REPORT_BY_ID(vehicleId, damageId));
  },

  listOdometerLogs: async (vehicleId: string): Promise<{ success: boolean; odometerLogs: VehicleOdometerLog[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.ODOMETER_LOGS(vehicleId));
  },

  createOdometerLog: async (
    vehicleId: string,
    log: {
      reading: number;
      source?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; odometerLog: VehicleOdometerLog }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.ODOMETER_LOGS(vehicleId), log);
  },

  listLocationLogs: async (vehicleId: string): Promise<{ success: boolean; locationLogs: VehicleLocationLog[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.LOCATIONS(vehicleId));
  },

  createLocationLog: async (
    vehicleId: string,
    log: {
      latitude: number;
      longitude: number;
      address?: string;
      batteryLevel?: number;
      fuelLevel?: number;
    }
  ): Promise<{ success: boolean; locationLog: VehicleLocationLog }> => {
    return apiClient.post(API_ENDPOINTS.VEHICLES.LOCATIONS(vehicleId), log);
  },

  listAuditLogs: async (vehicleId: string): Promise<{ success: boolean; auditLogs: VehicleAuditLog[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.AUDIT_LOGS(vehicleId));
  },

  listBookings: async (vehicleId: string): Promise<{ success: boolean; bookings: VehicleBookingItem[] }> => {
    return apiClient.get(API_ENDPOINTS.VEHICLES.BOOKINGS(vehicleId));
  },

  // Pricing sub-domain integration
  pricing: vehiclePricingApi,
};
