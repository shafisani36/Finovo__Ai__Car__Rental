import { Router } from 'express';
import { InspectionController } from '../../modules/inspections/inspection.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const inspectionRouter = Router();

inspectionRouter.use(authenticate);

inspectionRouter.get('/', InspectionController.list);
inspectionRouter.get('/:id', InspectionController.getById);

inspectionRouter.post(
  '/analyze',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  InspectionController.analyze
);

inspectionRouter.patch(
  '/findings/:findingId/review',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  InspectionController.reviewFinding
);
