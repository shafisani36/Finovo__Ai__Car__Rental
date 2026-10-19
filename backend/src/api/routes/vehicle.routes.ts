import { Router } from 'express';
import { VehicleController } from '../../modules/fleet/vehicle.controller';
import { BrandController } from '../../modules/fleet/brand.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const vehicleRouter = Router();

// ==========================================
// 1. COLLECTION & AGGREGATION ENDPOINTS
// ==========================================
vehicleRouter.get('/', VehicleController.list);
vehicleRouter.get('/metrics', VehicleController.metrics);
vehicleRouter.get('/dashboard-stats', VehicleController.dashboardStats);
vehicleRouter.get('/categories', VehicleController.categories);
vehicleRouter.post(
  '/categories',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createCategory
);
vehicleRouter.put(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.updateCategory
);
vehicleRouter.delete(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.deleteCategory
);

// ==========================================
// 1.1 BRANDS & MODELS CRUD + VIN DECODER
// ==========================================
vehicleRouter.get('/brands', BrandController.listBrands);
vehicleRouter.post(
  '/brands/upload-logo',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.uploadLogo
);
vehicleRouter.get('/brands/:id', BrandController.getBrand);
vehicleRouter.post(
  '/brands',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.createBrand
);
vehicleRouter.put(
  '/brands/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.updateBrand
);
vehicleRouter.delete(
  '/brands/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.deleteBrand
);

// Models endpoints (standalone CRUD + nested under brand)
vehicleRouter.get('/models', BrandController.listModels);
vehicleRouter.get('/models/:id', BrandController.getModel);
vehicleRouter.post(
  '/models',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.createModel
);
vehicleRouter.post(
  '/brands/:brandId/models',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.createModel
);
vehicleRouter.put(
  '/models/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.updateModel
);
vehicleRouter.delete(
  '/models/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.deleteModel
);

// Automated VIN Decoder
vehicleRouter.get(
  '/vin-lookup/:vin',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  BrandController.decodeVin
);


// ==========================================
// 2. PROTECTED VEHICLE CREATION & MEDIA
// ==========================================
vehicleRouter.post(
  '/upload-images',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.uploadPhotos
);

vehicleRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.create
);

// ==========================================
// 3. SINGLE VEHICLE CORE CRUD & AVAILABILITY
// ==========================================
vehicleRouter.get('/:id', VehicleController.getById);
vehicleRouter.get('/:id/availability', VehicleController.checkAvailability);

vehicleRouter.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.update
);

vehicleRouter.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.delete
);

vehicleRouter.post(
  '/:id/archive',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.archive
);

vehicleRouter.post(
  '/:id/restore',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.restore
);

// ==========================================
// 4. SUB-RESOURCE: DOCUMENTS & EXPIRIES
// ==========================================
vehicleRouter.get('/:id/documents', VehicleController.listDocuments);
vehicleRouter.post(
  '/:id/documents',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createDocument
);
vehicleRouter.delete(
  '/:id/documents/:docId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.deleteDocument
);

// ==========================================
// 5. SUB-RESOURCE: MAINTENANCE & REPAIRS
// ==========================================
vehicleRouter.get('/:id/maintenance', VehicleController.listMaintenance);
vehicleRouter.post(
  '/:id/maintenance',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createMaintenance
);
vehicleRouter.patch(
  '/:id/maintenance/:maintId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.updateMaintenance
);
vehicleRouter.delete(
  '/:id/maintenance/:maintId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.deleteMaintenance
);

// ==========================================
// 6. SUB-RESOURCE: DAMAGE REPORTS
// ==========================================
vehicleRouter.get('/:id/damage-reports', VehicleController.listDamageReports);
vehicleRouter.post(
  '/:id/damage-reports',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createDamageReport
);
vehicleRouter.patch(
  '/:id/damage-reports/:damageId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.updateDamageReport
);
vehicleRouter.delete(
  '/:id/damage-reports/:damageId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.deleteDamageReport
);

// ==========================================
// 7. SUB-RESOURCE: ODOMETER LOGS
// ==========================================
vehicleRouter.get('/:id/odometer-logs', VehicleController.listOdometerLogs);
vehicleRouter.post(
  '/:id/odometer-logs',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createOdometerLog
);

// ==========================================
// 8. SUB-RESOURCE: LOCATION LOGS
// ==========================================
vehicleRouter.get('/:id/locations', VehicleController.listLocationLogs);
vehicleRouter.post(
  '/:id/locations',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createLocationLog
);

// ==========================================
// 9. SUB-RESOURCE: PRICING TIERS
// ==========================================
vehicleRouter.get('/:id/pricing', VehicleController.listPricingTiers);
vehicleRouter.post(
  '/:id/pricing',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.createPricingTier
);
vehicleRouter.patch(
  '/:id/pricing/:tierId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.updatePricingTier
);
vehicleRouter.delete(
  '/:id/pricing/:tierId',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  VehicleController.deletePricingTier
);

// ==========================================
// 10. SUB-RESOURCE: AUDIT LOGS
// ==========================================
vehicleRouter.get('/:id/audit-logs', VehicleController.listAuditLogs);

// ==========================================
// 11. SUB-RESOURCE: BOOKINGS & AVAILABILITY
// ==========================================
vehicleRouter.get('/:id/bookings', VehicleController.listBookings);
vehicleRouter.get('/:id/availability', VehicleController.checkAvailability);


