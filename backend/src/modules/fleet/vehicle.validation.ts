import { z } from 'zod';

export const vehicleFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'ALL']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(['dailyRate', 'year', 'createdAt', 'model']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const vehiclePhotoInputSchema = z.object({
  url: z.string().optional(),
  data: z.string().optional(),
  caption: z.string().max(128).optional(),
  isPrimary: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
}).refine((data) => Boolean(data.url || data.data), {
  message: 'Each photo must provide either a URL or image data',
});

export const createVehicleSchema = z.object({
  brand: z.string().min(1, 'Brand is required').max(64),
  model: z.string().min(1, 'Model is required').max(64),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 2),
  trim: z.string().max(64).optional().nullable(),
  registrationNumber: z.string().min(1, 'Registration number is required').max(32),
  vin: z.string().max(64).optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  branchId: z.string().optional().nullable(),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']).default('AUTOMATIC'),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']).default('PETROL'),
  engineSize: z.string().max(64).optional().nullable(),
  horsePower: z.coerce.number().int().min(0).max(3000).optional().nullable(),
  drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD']).optional().nullable(),
  fuelTankCapacity: z.string().max(32).optional().nullable(),
  fuelLevelPercent: z.coerce.number().int().min(0).max(100).default(100),
  seats: z.coerce.number().min(1).max(20).default(5),
  doors: z.coerce.number().min(1).max(10).default(4),
  color: z.string().max(32).optional().nullable(),
  colorHex: z.string().max(16).optional().nullable(),
  mileage: z.coerce.number().min(0).default(0),
  pricingMethod: z.enum(['daily', 'per_km', 'daily_extra_km', 'hourly', 'monthly']).default('daily'),
  currency: z.string().max(8).default('PKR'),
  dailyRate: z.coerce.number().min(0).default(0),
  weeklyRate: z.coerce.number().positive().optional().nullable(),
  monthlyRate: z.coerce.number().positive().optional().nullable(),
  perKmRate: z.coerce.number().positive().optional().nullable(),
  hourlyRate: z.coerce.number().positive().optional().nullable(),
  minimumTripCharge: z.coerce.number().min(0).optional().nullable(),
  minimumBillableHours: z.coerce.number().int().min(1).default(1).optional().nullable(),
  billingIncrementMinutes: z.coerce.number().int().min(15).default(60).optional().nullable(),
  gracePeriodMinutes: z.coerce.number().int().min(0).default(0).optional().nullable(),
  partialMonthPolicy: z.string().max(32).default('prorated_daily').optional().nullable(),
  securityDeposit: z.coerce.number().min(0).optional().nullable(),
  excessMileageFee: z.coerce.number().min(0).optional().nullable(),
  mileageLimitPerDay: z.coerce.number().int().min(0).default(250).optional().nullable(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'ARCHIVED']).default('AVAILABLE'),
  isPublicCatalog: z.boolean().default(true),
  vehicleCode: z.string().max(64).optional().nullable(),
  ownershipType: z.string().max(32).default('OWNED').optional(),
  acquisitionDate: z.string().optional().nullable(),
  acquisitionCost: z.coerce.number().min(0).optional().nullable(),
  isListed: z.boolean().default(true),
  isBookable: z.boolean().default(true),
  features: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  notes: z.string().optional().nullable(),
  parkingSpot: z.string().max(64).optional().nullable(),
  telematicsDeviceId: z.string().max(64).optional().nullable(),
  insurancePolicyNumber: z.string().max(128).optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceMileage: z.coerce.number().int().min(0).optional().nullable(),
  nextServiceMileage: z.coerce.number().int().min(0).optional().nullable(),
  photos: z.array(vehiclePhotoInputSchema)
    .min(4, 'Fleet compliance requires a minimum of 4 vehicle photos (e.g. Front, Rear, Interior, and Side views).')
    .max(6, 'A maximum of 6 vehicle photos can be uploaded per vehicle.'),
  primaryImageUrl: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.pricingMethod === 'daily' || data.pricingMethod === 'daily_extra_km') {
    if (!data.dailyRate || data.dailyRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyRate'],
        message: 'Daily rate is required and must be greater than 0 for daily pricing',
      });
    }
  }
  if (data.pricingMethod === 'per_km') {
    if (!data.perKmRate || data.perKmRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['perKmRate'],
        message: 'Per-kilometer rate is required and must be greater than 0 for per_km pricing',
      });
    }
  }
  if (data.pricingMethod === 'hourly') {
    if (!data.hourlyRate || data.hourlyRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hourlyRate'],
        message: 'Hourly rate is required and must be greater than 0 for hourly pricing',
      });
    }
  }
  if (data.pricingMethod === 'monthly') {
    if (!data.monthlyRate || data.monthlyRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthlyRate'],
        message: 'Monthly rate is required and must be greater than 0 for monthly pricing',
      });
    }
  }
});

export const updateVehicleSchema = z.object({
  brand: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(64).optional(),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 2).optional(),
  trim: z.string().max(64).optional().nullable(),
  registrationNumber: z.string().min(1).max(32).optional(),
  vin: z.string().max(64).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  branchId: z.string().optional().nullable(),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']).optional(),
  engineSize: z.string().max(64).optional().nullable(),
  horsePower: z.coerce.number().int().min(0).max(3000).optional().nullable(),
  drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD']).optional().nullable(),
  fuelTankCapacity: z.string().max(32).optional().nullable(),
  fuelLevelPercent: z.coerce.number().int().min(0).max(100).optional(),
  seats: z.coerce.number().min(1).max(20).optional(),
  doors: z.coerce.number().min(1).max(10).optional(),
  color: z.string().max(32).optional().nullable(),
  colorHex: z.string().max(16).optional().nullable(),
  mileage: z.coerce.number().min(0).optional(),
  pricingMethod: z.enum(['daily', 'per_km', 'daily_extra_km', 'hourly', 'monthly']).optional(),
  currency: z.string().max(8).optional(),
  dailyRate: z.coerce.number().min(0).optional(),
  weeklyRate: z.coerce.number().positive().optional().nullable(),
  monthlyRate: z.coerce.number().positive().optional().nullable(),
  perKmRate: z.coerce.number().positive().optional().nullable(),
  hourlyRate: z.coerce.number().positive().optional().nullable(),
  minimumTripCharge: z.coerce.number().min(0).optional().nullable(),
  minimumBillableHours: z.coerce.number().int().min(1).optional().nullable(),
  billingIncrementMinutes: z.coerce.number().int().min(15).optional().nullable(),
  gracePeriodMinutes: z.coerce.number().int().min(0).optional().nullable(),
  partialMonthPolicy: z.string().max(32).optional().nullable(),
  securityDeposit: z.coerce.number().min(0).optional().nullable(),
  excessMileageFee: z.coerce.number().min(0).optional().nullable(),
  mileageLimitPerDay: z.coerce.number().int().min(0).optional().nullable(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'ARCHIVED']).optional(),
  isPublicCatalog: z.boolean().optional(),
  vehicleCode: z.string().max(64).optional().nullable(),
  ownershipType: z.string().max(32).optional(),
  acquisitionDate: z.string().optional().nullable(),
  acquisitionCost: z.coerce.number().min(0).optional().nullable(),
  isListed: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  features: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  notes: z.string().optional().nullable(),
  parkingSpot: z.string().max(64).optional().nullable(),
  telematicsDeviceId: z.string().max(64).optional().nullable(),
  insurancePolicyNumber: z.string().max(128).optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceMileage: z.coerce.number().int().min(0).optional().nullable(),
  nextServiceMileage: z.coerce.number().int().min(0).optional().nullable(),
  photos: z.array(vehiclePhotoInputSchema).optional(),
  primaryImageUrl: z.string().optional().nullable(),
});

// ---------------- Document Validation ----------------
export const createDocumentSchema = z.object({
  documentType: z.enum([
    'INSURANCE',
    'REGISTRATION',
    'ROAD_TAX',
    'SAFETY_INSPECTION',
    'COMMERCIAL_PERMIT',
    'CUSTOMS_DECLARATION',
    'OTHER',
  ]),
  title: z.string().min(1, 'Title is required').max(128),
  documentNumber: z.string().max(128).optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  fileUrl: z.string().min(1, 'File URL or data is required'),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ---------------- Maintenance Validation ----------------
export const createMaintenanceSchema = z.object({
  maintenanceType: z.enum([
    'SCHEDULED_SERVICE',
    'OIL_CHANGE',
    'BRAKE_SERVICE',
    'TIRE_ROTATION_REPLACEMENT',
    'ENGINE_TUNEUP',
    'BATTERY_CHECK',
    'HVAC_SERVICE',
    'REPAIR',
    'BODY_WORK',
    'RECALL_ACTION',
    'OTHER',
  ]),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  title: z.string().max(128).optional().default('Scheduled Service'),
  description: z.string().optional().nullable(),
  serviceProvider: z.string().max(128).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  odometerReading: z.coerce.number().int().min(0).optional().nullable(),
  odometerValue: z.coerce.number().int().min(0).optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  costAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().max(8).default('USD'),
  invoiceNumber: z.string().max(64).optional().nullable(),
  nextServiceDueMileage: z.coerce.number().int().min(0).optional().nullable(),
  nextServiceMileage: z.coerce.number().int().min(0).optional().nullable(),
  nextServiceDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();

// ---------------- Damage Report Validation ----------------
export const createDamageReportSchema = z.object({
  bookingId: z.string().optional().nullable(),
  damageType: z.string().min(1, 'Damage type is required').max(64),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  status: z.enum(['REPORTED', 'ASSESSED', 'REPAIR_SCHEDULED', 'RESOLVED']).default('REPORTED'),
  locationOnVehicle: z.string().max(64).optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  estimatedRepairCost: z.coerce.number().min(0).optional().nullable(),
  actualRepairCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().max(8).default('USD'),
  photoUrls: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  resolvedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateDamageReportSchema = createDamageReportSchema.partial();

// ---------------- Odometer Log Validation ----------------
export const createOdometerLogSchema = z.object({
  odometerReading: z.coerce.number().int().min(0, 'Odometer reading must be non-negative'),
  source: z.preprocess(
    (val) => {
      if (val === 'MANUAL_AUDIT') return 'AUDIT';
      if (val === 'TRIP_RETURN') return 'RETURN';
      if (val === 'TRIP_START') return 'CHECK_OUT';
      if (val === 'MAINTENANCE') return 'SERVICE';
      return val;
    },
    z.enum(['MANUAL', 'CHECK_OUT', 'RETURN', 'SERVICE', 'AUDIT', 'TELEMATICS']).default('MANUAL')
  ),
  bookingId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ---------------- Location Log Validation ----------------
export const createLocationLogSchema = z.object({
  branchId: z.string().optional().nullable(),
  parkingBay: z.string().max(64).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  locationSource: z.string().max(64).default('BRANCH_ASSIGNMENT'),
  notes: z.string().optional().nullable(),
});

// ---------------- Pricing Tier Validation ----------------
export const createPricingTierSchema = z.object({
  rateName: z.string().min(1, 'Rate name is required').max(64),
  billingUnit: z.preprocess(
    (val) => {
      if (val === 'DAILY') return 'DAY';
      if (val === 'WEEKLY') return 'WEEK';
      if (val === 'MONTHLY') return 'MONTH';
      if (val === 'HOURLY') return 'HOUR';
      return val;
    },
    z.enum(['DAY', 'WEEK', 'MONTH', 'HOUR']).default('DAY')
  ),
  baseRate: z.coerce.number().positive('Base rate must be positive'),
  currency: z.string().max(8).default('USD'),
  securityDeposit: z.coerce.number().min(0).optional().nullable(),
  includedKmPerDay: z.coerce.number().int().min(0).default(250).optional().nullable(),
  extraKmRate: z.coerce.number().min(0).optional().nullable(),
  minimumDurationDays: z.coerce.number().int().min(1).default(1),
  maximumDurationDays: z.coerce.number().int().min(1).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePricingTierSchema = createPricingTierSchema.partial();

// ---------------- Archive & Availability ----------------
export const archiveVehicleSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const checkAvailabilitySchema = z.object({
  pickupDateTime: z.string().min(1, 'Pickup date time is required'),
  returnDateTime: z.string().min(1, 'Return date time is required'),
});

export type VehicleFilterInput = z.infer<typeof vehicleFilterSchema>;
export type VehiclePhotoInputType = z.infer<typeof vehiclePhotoInputSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>;
export type UpdateDamageReportInput = z.infer<typeof updateDamageReportSchema>;
export type CreateOdometerLogInput = z.infer<typeof createOdometerLogSchema>;
export type CreateLocationLogInput = z.infer<typeof createLocationLogSchema>;
export type CreatePricingTierInput = z.infer<typeof createPricingTierSchema>;
export type UpdatePricingTierInput = z.infer<typeof updatePricingTierSchema>;
export type ArchiveVehicleInput = z.infer<typeof archiveVehicleSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

