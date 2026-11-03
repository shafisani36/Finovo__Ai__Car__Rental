import { Request, Response, NextFunction } from 'express';
import { CustomerService } from './customer.service';

export class CustomerController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const customers = await CustomerService.listCustomers(search);
      res.status(200).json({ success: true, customers });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const customer = await CustomerService.getById(id);
      res.status(200).json({ success: true, customer });
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { isLicenseVerified } = req.body;
      const updated = await CustomerService.updateVerification(id, Boolean(isLicenseVerified));
      res.status(200).json({ success: true, customer: updated });
    } catch (err) {
      next(err);
    }
  }
}
