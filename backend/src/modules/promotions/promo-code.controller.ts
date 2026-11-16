import { Request, Response, NextFunction } from 'express';
import { PromoCodeService } from './promo-code.service';

export class PromoCodeController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, promoCodes: await PromoCodeService.list() });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promoCode = await PromoCodeService.create(req.body || {}, req.user?.userId);
      res.status(201).json({ success: true, promoCode });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promoCode = await PromoCodeService.update(String(req.params.id), req.body || {});
      res.status(200).json({ success: true, promoCode });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoCodeService.remove(String(req.params.id));
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
