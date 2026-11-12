import { Router } from 'express';
import { StripePaymentController } from '../../modules/payments/stripe-payment.controller';
import { authenticate } from '../../middleware/authenticate';

export const paymentRouter = Router();

// Public: tells the client whether Stripe is configured and which publishable key to load
paymentRouter.get('/stripe/config', StripePaymentController.config);

// Customer: create a PaymentIntent for the outstanding booking balance, then verify it after confirmation
paymentRouter.post('/stripe/intent', authenticate, StripePaymentController.createIntent);
paymentRouter.post('/stripe/confirm', authenticate, StripePaymentController.confirm);
