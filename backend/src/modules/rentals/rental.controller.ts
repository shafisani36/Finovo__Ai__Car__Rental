import { Request, Response, NextFunction } from 'express';
import { RentalService } from './rental.service';

export class RentalController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const rentals = await RentalService.listRentals(status);
      res.status(200).json({ success: true, rentals });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const rental = await RentalService.getById(id);
      res.status(200).json({ success: true, rental });
    } catch (err) {
      next(err);
    }
  }

  static async handover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rental = await RentalService.handover(req.body, req.user?.userId);
      res.status(201).json({ success: true, rental });
    } catch (err) {
      next(err);
    }
  }

  static async previewSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preview = await RentalService.previewSettlement(req.body);
      res.status(200).json({ success: true, settlement: preview });
    } catch (err) {
      next(err);
    }
  }

  static async returnVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rental = await RentalService.returnVehicle(req.body, req.user?.userId);
      res.status(200).json({ success: true, rental });
    } catch (err) {
      next(err);
    }
  }
}
