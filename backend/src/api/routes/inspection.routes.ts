import { Router } from 'express';
import { InspectionController } from '../../modules/inspections/inspection.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const inspectionRouter = Router();

inspectionRouter.use(authenticate);

// Inspection read operations (authenticated users, customers & staff)
inspectionRouter.get('/', InspectionController.list);
inspectionRouter.get('/:id', InspectionController.getById);

// AI Computer Vision Analysis: Open to Customers during checkout/return & Staff
inspectionRouter.post('/analyze', InspectionController.analyze);

// Inspection comparison (baseline vs return): Open to Customers during return & Staff
inspectionRouter.post('/compare', InspectionController.compare);
inspectionRouter.get('/comparisons/:id', InspectionController.getComparisonById);

// Staff human verification
inspectionRouter.patch(
  '/findings/:findingId/review',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  InspectionController.reviewFinding
);
