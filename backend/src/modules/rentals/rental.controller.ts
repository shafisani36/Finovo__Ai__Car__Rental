import { Request, Response, NextFunction } from 'express';
import { RentalAgreementService } from '../agreements/rental-agreement.service';
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

  static async signAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const agreement = await RentalAgreementService.sign({
        bookingId: req.body?.bookingId,
        signerName: req.body?.signerName,
        signatureDataUrl: req.body?.signatureDataUrl,
        accepted: req.body?.accepted,
        pickupInspectionId: req.body?.pickupInspectionId,
        staffUserId: req.user?.userId,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
      });
      res.status(201).json({ success: true, agreement });
    } catch (err) {
      next(err);
    }
  }

  static async getAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const agreement = await RentalAgreementService.getForBooking(String(req.params.bookingId));
      res.status(200).json({ success: true, agreement });
    } catch (err) {
      next(err);
    }
  }

  static async downloadAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await RentalAgreementService.readPdf(String(req.params.bookingId));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(file.content);
    } catch (err) {
      next(err);
    }
  }

  static agreementTerms(_req: Request, res: Response): void {
    res.status(200).json({ success: true, ...RentalAgreementService.terms() });
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
