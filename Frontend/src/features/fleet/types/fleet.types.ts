export interface VehicleCategory {
  id: string;
  name: string;
  slug: string;
  baseRate: number | string;
  description?: string | null;
}

export interface VehiclePhoto {
  id: string;
  vehicleId: string;
  url: string;
  caption?: string | null;
  isPrimary: boolean;
  order: number;
  createdAt?: string;
}

export interface VehiclePhotoInput {
  url?: string;
  data?: string; // Base64 data URL
  caption?: string;
  isPrimary?: boolean;
  order?: number;
}

export type PricingMethod = 'daily' | 'per_km' | 'daily_extra_km' | 'hourly' | 'monthly';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  trim?: string | null;
  registrationNumber: string;
  vin?: string | null;
  categoryId: string;
  category?: VehicleCategory;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    city: string;
  } | null;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  engineSize?: string | null;
  horsePower?: number | null;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD' | null;
  fuelTankCapacity?: string | null;
  fuelLevelPercent?: number | null;
  seats: number;
  doors: number;
  color?: string | null;
  colorHex?: string | null;
  mileage: number;
  pricingMethod?: PricingMethod;
  currency?: string;
  dailyRate: number | string;
  weeklyRate?: number | string | null;
  monthlyRate?: number | string | null;
  perKmRate?: number | string | null;
  hourlyRate?: number | string | null;
  minimumTripCharge?: number | string | null;
  minimumBillableHours?: number | null;
  billingIncrementMinutes?: number | null;
  gracePeriodMinutes?: number | null;
  partialMonthPolicy?: string | null;
  securityDeposit?: number | string | null;
  excessMileageFee?: number | string | null;
  extraMileageCharge?: number | string | null;
  extraKmRate?: number | string | null;
  mileageLimitPerDay?: number | null;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RESERVED' | 'ARCHIVED';
  isPublicCatalog: boolean;
  features?: string | string[] | null;
  notes?: string | null;
  parkingSpot?: string | null;
  telematicsDeviceId?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: string | null;
  vehicleCode?: string | null;
  ownershipType?: 'OWNED' | 'LEASED' | 'PARTNER' | string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | string | null;
  isListed?: boolean;
  isBookable?: boolean;
  deletedAt?: string | null;
  registrationExpiry?: string | null;
  lastServiceDate?: string | null;
  lastServiceMileage?: number | null;
  nextServiceMileage?: number | null;
  primaryImageUrl?: string | null;
  photos?: VehiclePhoto[];
  documents?: VehicleDocument[];
  maintenanceRecords?: VehicleMaintenance[];
  damageReports?: VehicleDamageReport[];
  odometerLogs?: VehicleOdometerLog[];
  locationLogs?: VehicleLocationLog[];
  pricingTiers?: VehiclePricingTier[];
  auditLogs?: VehicleAuditLog[];
  bookings?: VehicleBookingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  documentType: 'INSURANCE' | 'REGISTRATION' | 'ROAD_TAX' | 'SAFETY_INSPECTION' | 'COMMERCIAL_PERMIT' | 'CUSTOMS_DECLARATION' | 'OTHER';
  title: string;
  documentNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  verificationStatus: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  maintenanceType: 'SCHEDULED_SERVICE' | 'OIL_CHANGE' | 'BRAKE_SERVICE' | 'TIRE_ROTATION_REPLACEMENT' | 'ENGINE_TUNEUP' | 'BATTERY_CHECK' | 'HVAC_SERVICE' | 'REPAIR' | 'BODY_WORK' | 'RECALL_ACTION' | 'OTHER' | string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  title?: string;
  description?: string | null;
  serviceProvider?: string | null;
  scheduledDate?: string;
  scheduledAt?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
  completedAt?: string | null;
  odometerReading?: number | null;
  odometerValue?: number | null;
  cost?: number | string | null;
  costAmount?: number | string | null;
  currency: string;
  invoiceNumber?: string | null;
  nextServiceDueMileage?: number | null;
  nextServiceDueDate?: string | null;
  nextServiceMileage?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDamageReport {
  id: string;
  vehicleId: string;
  bookingId?: string | null;
  reportedBy?: string | null;
  reportedDate?: string;
  reportedAt?: string;
  damageType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'REPORTED' | 'ASSESSED' | 'REPAIR_SCHEDULED' | 'RESOLVED' | 'UNDER_REVIEW' | 'IN_REPAIR' | 'REPAIRED' | 'DISMISSED' | string;
  locationOnVehicle?: string | null;
  description: string;
  estimatedRepairCost?: number | string | null;
  actualRepairCost?: number | string | null;
  currency: string;
  photoUrls?: string | string[] | null;
  resolvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleOdometerLog {
  id: string;
  vehicleId: string;
  bookingId?: string | null;
  odometerReading: number;
  source: 'MANUAL' | 'CHECK_OUT' | 'RETURN' | 'SERVICE' | 'AUDIT' | 'TELEMATICS' | string;
  recordedBy?: string | null;
  recordedAt: string;
  notes?: string | null;
}

export interface VehicleLocationLog {
  id: string;
  vehicleId: string;
  branchId?: string | null;
  branch?: { id: string; name: string; code?: string } | null;
  parkingBay?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationSource: string;
  recordedAt: string;
  notes?: string | null;
}

export interface VehiclePricingTier {
  id: string;
  vehicleId: string;
  rateName: string;
  pricingMethod?: PricingMethod;
  billingUnit: 'DAY' | 'WEEK' | 'MONTH' | 'HOUR' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'HOURLY' | string;
  baseRate: number | string;
  currency: string;
  perKmRate?: number | string | null;
  hourlyRate?: number | string | null;
  monthlyRate?: number | string | null;
  minimumTripCharge?: number | string | null;
  minimumBillableHours?: number | null;
  billingIncrementMinutes?: number | null;
  gracePeriodMinutes?: number | null;
  partialMonthPolicy?: string | null;
  securityDeposit?: number | string | null;
  includedKmPerDay?: number | null;
  extraKmRate?: number | string | null;
  minimumDurationDays?: number;
  maximumDurationDays?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAuditLog {
  id: string;
  vehicleId: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  details?: string | null;
  changes?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    registrationNumber: string;
  };
}

export interface VehicleBookingItem {
  id: string;
  bookingNumber: string;
  pickupDateTime: string;
  returnDateTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
  dailyRate: number | string;
  totalDays?: number;
  totalAmount: number | string;
  currency: string;
  customer?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  } | null;
  pickupBranch?: { id: string; name: string } | null;
  returnBranch?: { id: string; name: string } | null;
}

export interface FleetMetrics {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  archived?: number;
}

export interface FleetDashboardStats {
  metrics: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    archived: number;
    expiredDocuments: number;
    expiringSoonDocuments: number;
    maintenanceDue: number;
  };
  categoryBreakdown: Array<{ id: string; name: string; count: number }>;
  brandBreakdown: Array<{ brand: string; count: number }>;
  fuelBreakdown: Array<{ fuelType: string; count: number }>;
  recentActivity: VehicleAuditLog[];
}

export interface VehicleListResponse {
  success: boolean;
  vehicles: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleFormData {
  brand: string;
  model: string;
  year: number;
  trim?: string;
  vehicleCode?: string;
  ownershipType?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  isListed?: boolean;
  isBookable?: boolean;
  registrationNumber: string;
  vin?: string;
  categoryId: string;
  branchId?: string;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  engineSize?: string;
  horsePower?: number;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
  fuelTankCapacity?: string;
  fuelLevelPercent?: number;
  seats: number;
  doors: number;
  color?: string;
  colorHex?: string;
  mileage: number;
  pricingMethod?: 'daily' | 'per_km' | 'daily_extra_km' | 'hourly' | 'monthly';
  currency?: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  perKmRate?: number;
  hourlyRate?: number;
  minimumTripCharge?: number;
  minimumBillableHours?: number;
  billingIncrementMinutes?: number;
  gracePeriodMinutes?: number;
  partialMonthPolicy?: string;
  securityDeposit?: number;
  excessMileageFee?: number;
  mileageLimitPerDay?: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RESERVED' | 'ARCHIVED';
  isPublicCatalog: boolean;
  features?: string[];
  notes?: string;
  parkingSpot?: string;
  telematicsDeviceId?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  lastServiceDate?: string;
  lastServiceMileage?: number;
  nextServiceMileage?: number;
  photos: VehiclePhotoInput[];
  primaryImageUrl?: string;
}

export interface VehicleModelItem {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  bodyType?: string | null;
  defaultCategoryId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string | null;
    country?: string | null;
    isActive?: boolean;
  };
}

export interface VehicleBrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  models?: VehicleModelItem[];
  _count?: {
    models: number;
  };
}

export interface DecodedVinSpecs {
  vin: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  transmission: 'AUTOMATIC' | 'MANUAL';
  doors?: number;
  engineSize?: string;
  horsePower?: number;
  drivetrain?: string;
  suggestedCategory?: string;
}

