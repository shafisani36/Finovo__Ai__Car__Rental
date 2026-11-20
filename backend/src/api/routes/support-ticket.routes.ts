import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { SupportTicketController } from '../../modules/support/support-ticket.controller';

/** Staff inbox of customer support tickets */
export const supportTicketRouter = Router();

supportTicketRouter.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'));
supportTicketRouter.get('/', SupportTicketController.list);
supportTicketRouter.get('/:id', SupportTicketController.get);
supportTicketRouter.post('/:id/reply', SupportTicketController.reply);
supportTicketRouter.patch('/:id', SupportTicketController.update);
