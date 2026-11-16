import { Request, Response, NextFunction } from 'express';
import { InspectionService } from './inspection.service';
import { DamageDisputeService } from './damage-dispute.service';

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

export class InspectionController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspections = await InspectionService.listInspections({
        vehicleId: req.query.vehicleId ? String(req.query.vehicleId) : undefined,
        rentalId: req.query.rentalId ? String(req.query.rentalId) : undefined,
        type: req.query.type ? String(req.query.type) : undefined,
      });
      res.status(200).json({ success: true, inspections });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspection = await InspectionService.getById(param(req, 'id'));
      res.status(200).json({ success: true, inspection });
    } catch (err) {
      next(err);
    }
  }

  static async listForBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InspectionService.listForBooking(param(req, 'bookingId'), req.user!);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspection = await InspectionService.analyze(req.body, req.user?.userId);
      res.status(201).json({ success: true, inspection });
    } catch (err) {
      next(err);
    }
  }

  static async getComparisonById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comparison = await InspectionService.getComparisonById(param(req, 'id'));
      res.status(200).json({ success: true, comparison });
    } catch (err) {
      next(err);
    }
  }

  static async reviewCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comparison = await InspectionService.reviewCharge(param(req, 'chargeId'), req.body, req.user?.userId);
      res.status(200).json({ success: true, comparison });
    } catch (err) {
      next(err);
    }
  }

  /** Customer disputes one of their own damage charges. */
  static async openDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DamageDisputeService.open(param(req, 'chargeId'), req.user!.userId, req.body?.reason);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async resolveDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DamageDisputeService.resolve(param(req, 'chargeId'), req.user?.userId, req.body?.decision, req.body?.response);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async listDisputes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, disputes: await DamageDisputeService.list() });
    } catch (err) {
      next(err);
    }
  }
}
