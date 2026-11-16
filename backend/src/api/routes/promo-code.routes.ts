import { Router } from 'express';
import { PromoCodeController } from '../../modules/promotions/promo-code.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const promoCodeRouter = Router();

// Promo codes are managed by staff; customers only enter a code at checkout (validated in the booking quote)
promoCodeRouter.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN', 'OPERATOR'));
promoCodeRouter.get('/', PromoCodeController.list);
promoCodeRouter.post('/', PromoCodeController.create);
promoCodeRouter.patch('/:id', PromoCodeController.update);
promoCodeRouter.delete('/:id', PromoCodeController.remove);
