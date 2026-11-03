import { Request, Response, NextFunction } from 'express';
import { InspectionService } from './inspection.service';

export class InspectionController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspections = await InspectionService.listInspections();
      res.status(200).json({ success: true, inspections });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const inspection = await InspectionService.getById(id);
      res.status(200).json({ success: true, inspection });
    } catch (err) {
      next(err);
    }
  }

  static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspection = await InspectionService.runAiAnalysis(req.body, req.user?.userId);
      res.status(201).json({ success: true, inspection });
    } catch (err) {
      next(err);
    }
  }

  static async reviewFinding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const findingId = Array.isArray(req.params.findingId) ? req.params.findingId[0] : req.params.findingId;
      const updated = await InspectionService.reviewFinding(findingId, req.body, req.user?.userId);
      res.status(200).json({ success: true, finding: updated });
    } catch (err) {
      next(err);
    }
  }
}
