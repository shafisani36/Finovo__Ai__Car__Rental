import { Router } from 'express';
import { CustomerController } from '../../modules/customers/customer.controller';
import { CustomerPortalController } from '../../modules/customers/customer-portal.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const customerRouter = Router();

customerRouter.use(authenticate);

// ==========================================
// CUSTOMER PORTAL SELF-SERVICE ENDPOINTS
// ==========================================
customerRouter.get('/portal/overview', CustomerPortalController.getOverview);
customerRouter.get('/portal/bookings', CustomerPortalController.listBookings);
customerRouter.get('/portal/bookings/:id', CustomerPortalController.getBookingById);
customerRouter.post('/portal/bookings/:id/cancel', CustomerPortalController.cancelBooking);
customerRouter.post('/portal/bookings/:id/extend', CustomerPortalController.extendBooking);

customerRouter.get('/portal/payments', CustomerPortalController.getPaymentsSummary);
customerRouter.post('/portal/payments', CustomerPortalController.processPayment);

customerRouter.get('/portal/documents', CustomerPortalController.listDocuments);
customerRouter.post('/portal/documents', CustomerPortalController.uploadDocument);

customerRouter.patch('/portal/profile', CustomerPortalController.updateProfile);

customerRouter.get('/portal/notifications', CustomerPortalController.listNotifications);
customerRouter.patch('/portal/notifications/:id/read', CustomerPortalController.markNotificationRead);
customerRouter.patch('/portal/notifications/read-all', CustomerPortalController.markAllNotificationsRead);

customerRouter.get('/portal/support', CustomerPortalController.listSupportTickets);
customerRouter.post('/portal/support', CustomerPortalController.createSupportTicket);
customerRouter.post('/portal/support/:id/reply', CustomerPortalController.replyToSupportTicket);

customerRouter.post('/portal/ai-assistant', CustomerPortalController.askAiAssistant);

customerRouter.get('/portal/rewards', CustomerPortalController.getRewards);
customerRouter.get('/portal/history', CustomerPortalController.getRentalHistory);
customerRouter.post('/portal/reviews', CustomerPortalController.submitReview);

// ==========================================
// ADMIN & OPERATOR CUSTOMER MANAGEMENT
// ==========================================
customerRouter.get('/', requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'), CustomerController.list);
customerRouter.get('/:id', requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'), CustomerController.getById);
customerRouter.patch(
  '/:id/verify',
  requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'),
  CustomerController.verify
);
