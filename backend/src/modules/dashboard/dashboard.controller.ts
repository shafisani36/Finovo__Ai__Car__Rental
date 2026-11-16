import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { StaffNotificationService } from './staff-notification.service';

export class DashboardController {
  static async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getExecutiveOverview();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /** Live list of work waiting for staff, shown in the bell of the admin header. */
  static async getNotifications(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, ...(await StaffNotificationService.list()) });
    } catch (err) {
      next(err);
    }
  }
}
