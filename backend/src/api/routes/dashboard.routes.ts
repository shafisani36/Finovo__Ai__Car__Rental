import { Router } from 'express';
import { DashboardController } from '../../modules/dashboard/dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/overview',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  DashboardController.getOverview
);

dashboardRouter.get(
  '/notifications',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  DashboardController.getNotifications
);
