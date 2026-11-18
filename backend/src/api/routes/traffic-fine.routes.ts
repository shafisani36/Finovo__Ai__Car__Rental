import { Router } from 'express';
import { TrafficFineController } from '../../modules/traffic-fines/traffic-fine.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const trafficFineRouter = Router();

const STAFF = ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'] as const;

trafficFineRouter.use(authenticate);

// Customers: their own fines (ownership is checked in the service)
trafficFineRouter.get('/mine', TrafficFineController.mine);
trafficFineRouter.post('/:id/dispute', TrafficFineController.dispute);
trafficFineRouter.post('/:id/pay-intent', TrafficFineController.payIntent);
trafficFineRouter.post('/confirm-payment', TrafficFineController.confirmPayment);

// Staff: record fines, see who had the car, and close them
trafficFineRouter.get('/', requireRole(...STAFF), TrafficFineController.list);
trafficFineRouter.get('/match', requireRole(...STAFF), TrafficFineController.preview);
// Large body: the challan photo or PDF as a data URL
trafficFineRouter.post('/', requireRole(...STAFF), TrafficFineController.create);
trafficFineRouter.post('/:id/resolve-dispute', requireRole(...STAFF), TrafficFineController.resolveDispute);
trafficFineRouter.post('/:id/waive', requireRole(...STAFF), TrafficFineController.waive);
trafficFineRouter.post('/:id/mark-paid', requireRole(...STAFF), TrafficFineController.markPaid);
