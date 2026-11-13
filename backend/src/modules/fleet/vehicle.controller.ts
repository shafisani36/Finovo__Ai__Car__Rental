import { Request, Response, NextFunction } from 'express';
import { VehicleService } from './vehicle.service';
import { isStaffUser } from '../../middleware/authenticate';
import { getBusyPeriods } from '../bookings/booking.service';
import { VehicleImageService } from './vehicle-image.service';
import {
  vehicleFilterSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createDocumentSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
  createDamageReportSchema,
  updateDamageReportSchema,
  createOdometerLogSchema,
  createLocationLogSchema,
  createPricingTierSchema,
  updatePricingTierSchema,
  archiveVehicleSchema,
  checkAvailabilitySchema,
} from './vehicle.validation';

const PUBLIC_LIST_CACHE_MS = 10_000;
const PUBLIC_LIST_CACHE_MAX = 300;
const publicListCache = new Map<string, { body: unknown; expiresAt: number }>();

export class VehicleController {
  /** GET /vehicles/:id/busy-periods: public availability calendar (no customer data). */
  static async busyPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await getBusyPeriods(String(req.params.id));
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = vehicleFilterSchema.parse(req.query);
      const staff = isStaffUser(req.user);

      // The public catalog is the busiest endpoint: guests share a 10 second cache per query
      if (!staff) {
        const key = req.originalUrl;
        const cached = publicListCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          res.status(200).json(cached.body);
          return;
        }
        const body = { success: true, ...(await VehicleService.listVehicles(filters, { includeInternal: false })) };
        if (publicListCache.size >= PUBLIC_LIST_CACHE_MAX) publicListCache.clear();
        publicListCache.set(key, { body, expiresAt: Date.now() + PUBLIC_LIST_CACHE_MS });
        res.status(200).json(body);
        return;
      }

      const result = await VehicleService.listVehicles(filters, { includeInternal: true });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async metrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await VehicleService.getMetrics();
      res.status(200).json({ success: true, metrics });
    } catch (err) {
      next(err);
    }
  }

  static async dashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await VehicleService.getDashboardStats();
      res.status(200).json({ success: true, ...stats });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const vehicle = await VehicleService.getById(vehicleId, { includeInternal: isStaffUser(req.user) });
      res.status(200).json({ success: true, vehicle });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createVehicleSchema.parse(req.body);
      const vehicle = await VehicleService.createVehicle(validated, req.user?.userId);
      res.status(201).json({ success: true, vehicle });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = updateVehicleSchema.parse(req.body);
      const vehicle = await VehicleService.updateVehicle(vehicleId, validated, req.user?.userId);
      res.status(200).json({ success: true, vehicle });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await VehicleService.deleteVehicle(vehicleId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { reason } = archiveVehicleSchema.parse(req.body);
      const result = await VehicleService.archiveVehicle(vehicleId, reason, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await VehicleService.restoreVehicle(vehicleId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const pickupDateTime = (req.query.pickupDateTime || req.query.startDate) as string;
      const returnDateTime = (req.query.returnDateTime || req.query.endDate) as string;
      if (!pickupDateTime || !returnDateTime) {
        res.status(400).json({
          success: false,
          message: 'pickupDateTime (or startDate) and returnDateTime (or endDate) query parameters are required',
        });
        return;
      }
      const result = await VehicleService.checkAvailability(vehicleId, pickupDateTime, returnDateTime);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async uploadPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { photos } = req.body;
      const processed = await VehicleImageService.validateAndProcessPhotos(photos);
      res.status(200).json({ success: true, photos: processed });
    } catch (err) {
      next(err);
    }
  }

  static async categories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await VehicleService.listCategories();
      res.status(200).json({ success: true, categories });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, description, baseRate } = req.body;
      const category = await VehicleService.createCategory({ name, slug, description, baseRate });
      res.status(201).json({ success: true, category, message: 'Vehicle category created successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, slug, description, baseRate } = req.body;
      const category = await VehicleService.updateCategory(categoryId, { name, slug, description, baseRate });
      res.status(200).json({ success: true, category, message: 'Vehicle category updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await VehicleService.deleteCategory(categoryId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Documents ----------------
  static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const documents = await VehicleService.listDocuments(vehicleId);
      res.status(200).json({ success: true, documents });
    } catch (err) {
      next(err);
    }
  }

  static async createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createDocumentSchema.parse(req.body);
      const document = await VehicleService.createDocument(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, document });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const docId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
      const result = await VehicleService.deleteDocument(docId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Maintenance ----------------
  static async listMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const records = await VehicleService.listMaintenance(vehicleId);
      res.status(200).json({ success: true, maintenance: records });
    } catch (err) {
      next(err);
    }
  }

  static async createMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createMaintenanceSchema.parse(req.body);
      const record = await VehicleService.createMaintenance(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, maintenance: record });
    } catch (err) {
      next(err);
    }
  }

  static async updateMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenanceId = Array.isArray(req.params.maintId) ? req.params.maintId[0] : req.params.maintId;
      const validated = updateMaintenanceSchema.parse(req.body);
      const updated = await VehicleService.updateMaintenance(maintenanceId, validated, req.user?.userId);
      res.status(200).json({ success: true, maintenance: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenanceId = Array.isArray(req.params.maintId) ? req.params.maintId[0] : req.params.maintId;
      const result = await VehicleService.deleteMaintenance(maintenanceId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Damage Reports ----------------
  static async listDamageReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const reports = await VehicleService.listDamageReports(vehicleId);
      res.status(200).json({ success: true, damageReports: reports });
    } catch (err) {
      next(err);
    }
  }

  static async createDamageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createDamageReportSchema.parse(req.body);
      const report = await VehicleService.createDamageReport(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, damageReport: report });
    } catch (err) {
      next(err);
    }
  }

  static async updateDamageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = Array.isArray(req.params.damageId) ? req.params.damageId[0] : req.params.damageId;
      const validated = updateDamageReportSchema.parse(req.body);
      const updated = await VehicleService.updateDamageReport(reportId, validated, req.user?.userId);
      res.status(200).json({ success: true, damageReport: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDamageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = Array.isArray(req.params.damageId) ? req.params.damageId[0] : req.params.damageId;
      const result = await VehicleService.deleteDamageReport(reportId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Odometer Logs ----------------
  static async listOdometerLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const logs = await VehicleService.listOdometerLogs(vehicleId);
      res.status(200).json({ success: true, odometerLogs: logs });
    } catch (err) {
      next(err);
    }
  }

  static async createOdometerLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createOdometerLogSchema.parse(req.body);
      const log = await VehicleService.createOdometerLog(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, odometerLog: log });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Location Logs ----------------
  static async listLocationLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const logs = await VehicleService.listLocationLogs(vehicleId);
      res.status(200).json({ success: true, locationLogs: logs });
    } catch (err) {
      next(err);
    }
  }

  static async createLocationLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createLocationLogSchema.parse(req.body);
      const log = await VehicleService.createLocationLog(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, locationLog: log });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Pricing Tiers ----------------
  static async listPricingTiers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const tiers = await VehicleService.listPricingTiers(vehicleId);
      res.status(200).json({ success: true, pricingTiers: tiers });
    } catch (err) {
      next(err);
    }
  }

  static async createPricingTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validated = createPricingTierSchema.parse(req.body);
      const tier = await VehicleService.createPricingTier(vehicleId, validated, req.user?.userId);
      res.status(201).json({ success: true, pricingTier: tier });
    } catch (err) {
      next(err);
    }
  }

  static async updatePricingTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tierId = Array.isArray(req.params.tierId) ? req.params.tierId[0] : req.params.tierId;
      const validated = updatePricingTierSchema.parse(req.body);
      const updated = await VehicleService.updatePricingTier(tierId, validated, req.user?.userId);
      res.status(200).json({ success: true, pricingTier: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deletePricingTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tierId = Array.isArray(req.params.tierId) ? req.params.tierId[0] : req.params.tierId;
      const result = await VehicleService.deletePricingTier(tierId, req.user?.userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Audit Logs ----------------
  static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const logs = await VehicleService.listAuditLogs(vehicleId);
      res.status(200).json({ success: true, auditLogs: logs });
    } catch (err) {
      next(err);
    }
  }

  // ---------------- Bookings ----------------
  static async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const bookings = await VehicleService.listBookings(vehicleId);
      res.status(200).json({ success: true, bookings });
    } catch (err) {
      next(err);
    }
  }
}

