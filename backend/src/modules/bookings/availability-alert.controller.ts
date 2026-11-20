import { Request, Response, NextFunction } from 'express';
import { AvailabilityAlertService } from './availability-alert.service';

export const AvailabilityAlertController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, ...(await AvailabilityAlertService.list(req.user!.userId)) });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AvailabilityAlertService.create(req.user!.userId, req.body || {});
      res.status(result.created ? 201 : 200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, ...(await AvailabilityAlertService.cancel(req.user!.userId, String(req.params.id))) });
    } catch (err) {
      next(err);
    }
  },
};
