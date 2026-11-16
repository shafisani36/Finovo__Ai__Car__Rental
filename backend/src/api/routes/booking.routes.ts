import { Router } from 'express';
import { BookingController } from '../../modules/bookings/booking.controller';
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
bookingRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'FLEET_MANAGER'),
  BookingController.updateStatus
);
