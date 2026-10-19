import { Router } from 'express';
import { BookingController } from '../../modules/bookings/booking.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const bookingRouter = Router();

// Availability check & quote (public or customer/staff)
bookingRouter.get('/availability', BookingController.checkAvailability);
bookingRouter.get('/quote', BookingController.quote);
bookingRouter.get('/calendar', authenticate, BookingController.calendar);

// Protected Staff & Customer booking operations
bookingRouter.get('/', authenticate, BookingController.list);
bookingRouter.get('/:id', authenticate, BookingController.getById);
bookingRouter.post('/', authenticate, BookingController.create);
bookingRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER'),
  BookingController.updateStatus
);
