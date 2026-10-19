import { Router } from 'express';
import { CustomerController } from '../../modules/customers/customer.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get('/', CustomerController.list);
customerRouter.get('/:id', CustomerController.getById);

customerRouter.patch(
  '/:id/verify',
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'),
  CustomerController.verify
);
