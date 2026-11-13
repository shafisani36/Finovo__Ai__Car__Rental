import { Router } from 'express';
import { RentalController } from '../../modules/rentals/rental.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const rentalRouter = Router();

rentalRouter.use(authenticate);

// Rental records hold every customer's data: staff only (customers use /customers/portal)
const STAFF = ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'];
rentalRouter.get('/', requireRole(...STAFF), RentalController.list);
rentalRouter.get('/:id', requireRole(...STAFF), RentalController.getById);

rentalRouter.post(
  '/handover',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  RentalController.handover
);

rentalRouter.post(
  '/preview-settlement',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  RentalController.previewSettlement
);

rentalRouter.post(
  '/return',
  requireRole('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'),
  RentalController.returnVehicle
);
