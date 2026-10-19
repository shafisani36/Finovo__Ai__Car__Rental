import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  static async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getExecutiveOverview();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
