import { Router } from 'express';
import { BookingController } from '../../modules/bookings/booking.controller';
import { BookingApprovalController } from '../../modules/bookings/booking-approval.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const bookingRouter = Router();

// Availability check & quote (public or customer/staff)
bookingRouter.get('/availability', BookingController.checkAvailability);
bookingRouter.get('/quote', optionalAuthenticate, BookingController.quote);
bookingRouter.get('/options', BookingController.options);
bookingRouter.get(
  '/calendar',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER'),
  BookingController.calendar
);

// Protected Staff & Customer booking operations
bookingRouter.get('/', authenticate, BookingController.list);
bookingRouter.get('/:id', authenticate, BookingController.getById);
bookingRouter.post('/', authenticate, BookingController.create);
// Staff approval of paid online bookings after checking the customer's documents
const APPROVERS = ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER'] as const;
bookingRouter.get('/:id/review', authenticate, requireRole(...APPROVERS), BookingApprovalController.review);
bookingRouter.post('/:id/approve', authenticate, requireRole(...APPROVERS), BookingApprovalController.approve);
bookingRouter.post('/:id/reject', authenticate, requireRole(...APPROVERS), BookingApprovalController.reject);
bookingRouter.post('/:id/request-documents', authenticate, requireRole(...APPROVERS), BookingApprovalController.requestDocuments);
bookingRouter.patch('/documents/:documentId/verification', authenticate, requireRole(...APPROVERS), BookingApprovalController.verifyDocument);
bookingRouter.patch('/drivers/:driverId/verification', authenticate, requireRole(...APPROVERS), BookingApprovalController.verifyDriver);
bookingRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER'),
  BookingController.updateStatus
);
