import { Router } from 'express';
import { RentalController } from '../../modules/rentals/rental.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const rentalRouter = Router();

rentalRouter.use(authenticate);

rentalRouter.get('/', RentalController.list);
rentalRouter.get('/:id', RentalController.getById);

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
