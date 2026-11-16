import { Router } from 'express';
import { InspectionController } from '../../modules/inspections/inspection.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const inspectionRouter = Router();

const STAFF = ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'] as const;

inspectionRouter.use(authenticate);

// Customers see only the reports of their own bookings; staff see everything
inspectionRouter.get('/booking/:bookingId', InspectionController.listForBooking);
// Customers dispute their own damage charges (ownership is checked in the service)
inspectionRouter.post('/charges/:chargeId/dispute', InspectionController.openDispute);

// Staff operations
inspectionRouter.get('/', requireRole(...STAFF), InspectionController.list);
inspectionRouter.get('/disputes', requireRole(...STAFF), InspectionController.listDisputes);
inspectionRouter.post('/charges/:chargeId/resolve-dispute', requireRole(...STAFF), InspectionController.resolveDispute);
inspectionRouter.get('/comparisons/:id', requireRole(...STAFF), InspectionController.getComparisonById);
inspectionRouter.get('/:id', requireRole(...STAFF), InspectionController.getById);
// Large body: up to 6 compressed photos as data URLs
inspectionRouter.post('/analyze', requireRole(...STAFF), InspectionController.analyze);
inspectionRouter.patch('/charges/:chargeId/review', requireRole(...STAFF), InspectionController.reviewCharge);
