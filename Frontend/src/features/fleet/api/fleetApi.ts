import { authClient } from '../../auth/api/authClient';
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
  VehiclePricingTier,
  VehicleAuditLog,
  VehicleBookingItem,
  VehicleBrandItem,
  VehicleModelItem,
  DecodedVinSpecs,
} from '../types/fleet.types';

export const fleetApi = {
  /**
   * Lists vehicles with filtering, search, and pagination
   */
  async getVehicles(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<VehicleListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    return authClient.request<VehicleListResponse>(`/vehicles${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetches aggregate metric counts for top fleet cards
   */
  async getMetrics(): Promise<{ success: boolean; metrics: FleetMetrics }> {
    return authClient.request<{ success: boolean; metrics: FleetMetrics }>('/vehicles/metrics');
  },

  /**
   * Fetches comprehensive live fleet dashboard statistics
   */
  async getDashboardStats(): Promise<{ success: boolean } & FleetDashboardStats> {
    return authClient.request<{ success: boolean } & FleetDashboardStats>('/vehicles/dashboard-stats');
  },

  /**
   * Retrieves single vehicle details by ID
   */
  async getVehicleById(id: string): Promise<{ success: boolean; vehicle: Vehicle }> {
    return authClient.request<{ success: boolean; vehicle: Vehicle }>(`/vehicles/${id}`);
  },

  /**
   * Fetches all available vehicle categories
   */
  async getCategories(): Promise<{ success: boolean; categories: (VehicleCategory & { _count?: { vehicles: number } })[] }> {
    return authClient.request<{ success: boolean; categories: (VehicleCategory & { _count?: { vehicles: number } })[] }>('/vehicles/categories');
  },

  /**
   * Creates a new vehicle category
   */
  async createCategory(data: { name: string; slug?: string; description?: string; baseRate?: number | string }): Promise<{ success: boolean; category: VehicleCategory; message: string }> {
    return authClient.request<{ success: boolean; category: VehicleCategory; message: string }>('/vehicles/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing vehicle category
   */
  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; baseRate?: number | string }): Promise<{ success: boolean; category: VehicleCategory; message: string }> {
    return authClient.request<{ success: boolean; category: VehicleCategory; message: string }>(`/vehicles/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes a vehicle category
   */
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(`/vehicles/categories/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Uploads and validates batch vehicle photos (min 4, max 6)
   */
  async uploadPhotos(photos: VehiclePhotoInput[]): Promise<{ success: boolean; photos: VehiclePhoto[] }> {
    return authClient.request<{ success: boolean; photos: VehiclePhoto[] }>('/vehicles/upload-images', {
      method: 'POST',
      body: JSON.stringify({ photos }),
    });
  },

  /**
   * Creates a new vehicle record
   */
  async createVehicle(data: VehicleFormData): Promise<{ success: boolean; vehicle: Vehicle }> {
    return authClient.request<{ success: boolean; vehicle: Vehicle }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing vehicle
   */
  async updateVehicle(id: string, data: Partial<VehicleFormData>): Promise<{ success: boolean; vehicle: Vehicle }> {
    return authClient.request<{ success: boolean; vehicle: Vehicle }>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Safely archives a vehicle after verifying no active bookings/rentals exist
   */
  async archiveVehicle(id: string, reason?: string): Promise<{ success: boolean; message: string; vehicle: Vehicle }> {
    return authClient.request<{ success: boolean; message: string; vehicle: Vehicle }>(`/vehicles/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Restores an archived vehicle to the active fleet
   */
  async restoreVehicle(id: string): Promise<{ success: boolean; message: string; vehicle: Vehicle }> {
    return authClient.request<{ success: boolean; message: string; vehicle: Vehicle }>(`/vehicles/${id}/restore`, {
      method: 'POST',
    });
  },

  /**
   * Checks vehicle availability against booking schedule and maintenance holds
   */
  async checkAvailability(
    id: string,
    pickupDateTime: string,
    returnDateTime: string
  ): Promise<{ success: boolean; isAvailable: boolean; reason?: string; conflictingBooking?: any }> {
    const qs = new URLSearchParams({ pickupDateTime, returnDateTime }).toString();
    return authClient.request<{ success: boolean; isAvailable: boolean; reason?: string; conflictingBooking?: any }>(
      `/vehicles/${id}/availability?${qs}`
    );
  },

  /**
   * Deletes a vehicle permanently (or archives if historical bookings/rentals exist)
   */
  async deleteVehicle(id: string): Promise<{ success: boolean; message: string; archived?: boolean }> {
    return authClient.request<{ success: boolean; message: string; archived?: boolean }>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------------- Documents API ----------------
  async getDocuments(vehicleId: string): Promise<{ success: boolean; documents: VehicleDocument[] }> {
    return authClient.request<{ success: boolean; documents: VehicleDocument[] }>(`/vehicles/${vehicleId}/documents`);
  },

  async addDocument(
    vehicleId: string,
    data: {
      documentType: string;
      title: string;
      documentNumber?: string;
      issuedAt?: string;
      expiresAt?: string;
      fileUrl: string;
      fileName?: string;
      fileSize?: number;
      notes?: string;
    }
  ): Promise<{ success: boolean; document: VehicleDocument }> {
    return authClient.request<{ success: boolean; document: VehicleDocument }>(`/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteDocument(vehicleId: string, docId: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(`/vehicles/${vehicleId}/documents/${docId}`, {
      method: 'DELETE',
    });
  },

  // ---------------- Maintenance API ----------------
  async getMaintenance(vehicleId: string): Promise<{ success: boolean; maintenance: VehicleMaintenance[] }> {
    return authClient.request<{ success: boolean; maintenance: VehicleMaintenance[] }>(`/vehicles/${vehicleId}/maintenance`);
  },

  async addMaintenance(
    vehicleId: string,
    data: {
      maintenanceType: string;
      status?: string;
      title: string;
      description?: string;
      serviceProvider?: string;
      scheduledDate: string;
      startDate?: string;
      completedDate?: string;
      odometerReading?: number;
      cost?: number;
      currency?: string;
      invoiceNumber?: string;
      nextServiceDueMileage?: number;
      nextServiceDueDate?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; maintenance: VehicleMaintenance }> {
    return authClient.request<{ success: boolean; maintenance: VehicleMaintenance }>(`/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMaintenance(
    vehicleId: string,
    maintId: string,
    data: Partial<VehicleMaintenance>
  ): Promise<{ success: boolean; maintenance: VehicleMaintenance }> {
    return authClient.request<{ success: boolean; maintenance: VehicleMaintenance }>(
      `/vehicles/${vehicleId}/maintenance/${maintId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  async deleteMaintenance(vehicleId: string, maintId: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(
      `/vehicles/${vehicleId}/maintenance/${maintId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ---------------- Damage Reports API ----------------
  async getDamageReports(vehicleId: string): Promise<{ success: boolean; damageReports: VehicleDamageReport[] }> {
    return authClient.request<{ success: boolean; damageReports: VehicleDamageReport[] }>(
      `/vehicles/${vehicleId}/damage-reports`
    );
  },

  async addDamageReport(
    vehicleId: string,
    data: {
      bookingId?: string;
      damageType: string;
      severity: string;
      status?: string;
      locationOnVehicle?: string;
      description: string;
      estimatedRepairCost?: number;
      actualRepairCost?: number;
      currency?: string;
      photoUrls?: string[];
      notes?: string;
    }
  ): Promise<{ success: boolean; damageReport: VehicleDamageReport }> {
    return authClient.request<{ success: boolean; damageReport: VehicleDamageReport }>(
      `/vehicles/${vehicleId}/damage-reports`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updateDamageReport(
    vehicleId: string,
    damageId: string,
    data: Partial<VehicleDamageReport>
  ): Promise<{ success: boolean; damageReport: VehicleDamageReport }> {
    return authClient.request<{ success: boolean; damageReport: VehicleDamageReport }>(
      `/vehicles/${vehicleId}/damage-reports/${damageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  async deleteDamageReport(vehicleId: string, damageId: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(
      `/vehicles/${vehicleId}/damage-reports/${damageId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ---------------- Odometer Logs API ----------------
  async getOdometerLogs(vehicleId: string): Promise<{ success: boolean; odometerLogs: VehicleOdometerLog[] }> {
    return authClient.request<{ success: boolean; odometerLogs: VehicleOdometerLog[] }>(
      `/vehicles/${vehicleId}/odometer-logs`
    );
  },

  async addOdometerLog(
    vehicleId: string,
    data: {
      odometerReading: number;
      source?: string;
      bookingId?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; odometerLog: VehicleOdometerLog }> {
    return authClient.request<{ success: boolean; odometerLog: VehicleOdometerLog }>(
      `/vehicles/${vehicleId}/odometer-logs`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // ---------------- Location Logs API ----------------
  async getLocationLogs(vehicleId: string): Promise<{ success: boolean; locationLogs: VehicleLocationLog[] }> {
    return authClient.request<{ success: boolean; locationLogs: VehicleLocationLog[] }>(
      `/vehicles/${vehicleId}/locations`
    );
  },

  async addLocationLog(
    vehicleId: string,
    data: {
      branchId?: string;
      parkingBay?: string;
      latitude?: number;
      longitude?: number;
      locationSource?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; locationLog: VehicleLocationLog }> {
    return authClient.request<{ success: boolean; locationLog: VehicleLocationLog }>(
      `/vehicles/${vehicleId}/locations`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // ---------------- Pricing Tiers API ----------------
  async getPricingTiers(vehicleId: string): Promise<{ success: boolean; pricingTiers: VehiclePricingTier[] }> {
    return authClient.request<{ success: boolean; pricingTiers: VehiclePricingTier[] }>(
      `/vehicles/${vehicleId}/pricing`
    );
  },

  async addPricingTier(
    vehicleId: string,
    data: {
      rateName: string;
      billingUnit: string;
      baseRate: number;
      currency?: string;
      securityDeposit?: number;
      includedKmPerDay?: number;
      extraKmRate?: number;
      minimumDurationDays?: number;
      maximumDurationDays?: number;
      validFrom?: string;
      validUntil?: string;
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; pricingTier: VehiclePricingTier }> {
    return authClient.request<{ success: boolean; pricingTier: VehiclePricingTier }>(
      `/vehicles/${vehicleId}/pricing`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updatePricingTier(
    vehicleId: string,
    tierId: string,
    data: Partial<VehiclePricingTier>
  ): Promise<{ success: boolean; pricingTier: VehiclePricingTier }> {
    return authClient.request<{ success: boolean; pricingTier: VehiclePricingTier }>(
      `/vehicles/${vehicleId}/pricing/${tierId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  async deletePricingTier(vehicleId: string, tierId: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(
      `/vehicles/${vehicleId}/pricing/${tierId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ---------------- Audit Logs API ----------------
  async getAuditLogs(vehicleId: string): Promise<{ success: boolean; auditLogs: VehicleAuditLog[] }> {
    return authClient.request<{ success: boolean; auditLogs: VehicleAuditLog[] }>(
      `/vehicles/${vehicleId}/audit-logs`
    );
  },

  // ---------------- Bookings API ----------------
  async getBookings(vehicleId: string): Promise<{ success: boolean; bookings: VehicleBookingItem[] }> {
    return authClient.request<{ success: boolean; bookings: VehicleBookingItem[] }>(
      `/vehicles/${vehicleId}/bookings`
    );
  },

  // Aliases for compatibility
  async createDocument(vehicleId: string, data: any) {
    return this.addDocument(vehicleId, data);
  },
  async createMaintenance(vehicleId: string, data: any) {
    return this.addMaintenance(vehicleId, data);
  },
  async createDamageReport(vehicleId: string, data: any) {
    return this.addDamageReport(vehicleId, data);
  },
  async createOdometerLog(vehicleId: string, data: any) {
    return this.addOdometerLog(vehicleId, data);
  },
  async createPricingTier(vehicleId: string, data: any) {
    return this.addPricingTier(vehicleId, data);
  },

  // ==========================================
  // BRANDS & MODELS CRUD API
  // ==========================================
  async getBrands(params?: { search?: string; isActive?: boolean }): Promise<{ success: boolean; brands: VehicleBrandItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    const qs = query.toString();
    return authClient.request<{ success: boolean; brands: VehicleBrandItem[]; total: number }>(
      `/vehicles/brands${qs ? `?${qs}` : ''}`
    );
  },

  async getBrand(id: string): Promise<{ success: boolean; brand: VehicleBrandItem }> {
    return authClient.request<{ success: boolean; brand: VehicleBrandItem }>(`/vehicles/brands/${id}`);
  },

  async uploadBrandLogo(base64Data: string, brandName?: string): Promise<{ success: boolean; logoUrl: string }> {
    return authClient.request<{ success: boolean; logoUrl: string }>('/vehicles/brands/upload-logo', {
      method: 'POST',
      body: JSON.stringify({ data: base64Data, name: brandName }),
    });
  },

  async createBrand(data: { name: string; country?: string; logoUrl?: string }): Promise<{ success: boolean; brand: VehicleBrandItem }> {
    return authClient.request<{ success: boolean; brand: VehicleBrandItem }>('/vehicles/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBrand(
    id: string,
    data: { name?: string; country?: string; logoUrl?: string; isActive?: boolean }
  ): Promise<{ success: boolean; brand: VehicleBrandItem }> {
    return authClient.request<{ success: boolean; brand: VehicleBrandItem }>(`/vehicles/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(`/vehicles/brands/${id}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // MODELS CRUD API
  // ==========================================
  async getModels(params?: {
    search?: string;
    brandId?: string;
    bodyType?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; models: VehicleModelItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.brandId) query.set('brandId', params.brandId);
    if (params?.bodyType) query.set('bodyType', params.bodyType);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    const qs = query.toString();
    return authClient.request<{ success: boolean; models: VehicleModelItem[]; total: number }>(
      `/vehicles/models${qs ? `?${qs}` : ''}`
    );
  },

  async getModel(id: string): Promise<{ success: boolean; model: VehicleModelItem }> {
    return authClient.request<{ success: boolean; model: VehicleModelItem }>(`/vehicles/models/${id}`);
  },

  async createModel(
    brandIdOrData: string | { name: string; brandId: string; bodyType?: string; defaultCategoryId?: string },
    dataParam?: { name: string; bodyType?: string; defaultCategoryId?: string }
  ): Promise<{ success: boolean; model: VehicleModelItem }> {
    if (typeof brandIdOrData === 'string') {
      const brandId = brandIdOrData;
      return authClient.request<{ success: boolean; model: VehicleModelItem }>(`/vehicles/brands/${brandId}/models`, {
        method: 'POST',
        body: JSON.stringify(dataParam || {}),
      });
    } else {
      return authClient.request<{ success: boolean; model: VehicleModelItem }>('/vehicles/models', {
        method: 'POST',
        body: JSON.stringify(brandIdOrData),
      });
    }
  },

  async updateModel(
    id: string,
    data: { name?: string; brandId?: string; bodyType?: string; isActive?: boolean; defaultCategoryId?: string }
  ): Promise<{ success: boolean; model: VehicleModelItem }> {
    return authClient.request<{ success: boolean; model: VehicleModelItem }>(`/vehicles/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteModel(id: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(`/vehicles/models/${id}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // VIN DECODER
  // ==========================================
  async decodeVin(vin: string): Promise<{ success: boolean; specs: DecodedVinSpecs }> {
    return authClient.request<{ success: boolean; specs: DecodedVinSpecs }>(
      `/vehicles/vin-lookup/${encodeURIComponent(vin.trim().toUpperCase())}`
    );
  },
};

