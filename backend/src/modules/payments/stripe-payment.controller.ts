import { Request, Response, NextFunction } from 'express';
import { StripePaymentService } from './stripe-payment.service';

export class StripePaymentController {
  static config(_req: Request, res: Response): void {
    res.status(200).json({ success: true, ...StripePaymentService.getPublicConfig() });
  }

  static async createIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId, amount } = req.body || {};
      const result = await StripePaymentService.createPaymentIntent(
        req.user!.userId,
        String(bookingId || ''),
        amount === undefined || amount === null ? undefined : Number(amount)
      );
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentIntentId } = req.body || {};
      const result = await StripePaymentService.confirmPayment(req.user!.userId, String(paymentIntentId || ''));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];
      const result = await StripePaymentService.handleWebhook(
        req.body as Buffer,
        Array.isArray(signature) ? signature[0] : signature
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
