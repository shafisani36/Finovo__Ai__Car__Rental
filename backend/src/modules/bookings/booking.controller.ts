import { Request, Response, NextFunction } from 'express';
import { BookingService } from './booking.service';

export class BookingController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BookingService.listBookings(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const booking = await BookingService.getById(id);
      res.status(200).json({ success: true, booking });
    } catch (err) {
      next(err);
    }
  }

  static async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId, pickupDateTime, returnDateTime } = req.query;
      if (!vehicleId || !pickupDateTime || !returnDateTime) {
        res.status(400).json({ success: false, message: 'vehicleId, pickupDateTime, and returnDateTime are required' });
        return;
      }

      const pDate = new Date(String(pickupDateTime));
      const rDate = new Date(String(returnDateTime));
      const result = await BookingService.checkAvailability(String(vehicleId), pDate, rDate);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async quote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId, pickupDateTime, returnDateTime, estimatedKm, driverRequired } = req.query;
      if (!vehicleId || !pickupDateTime || !returnDateTime) {
        res.status(400).json({ success: false, message: 'vehicleId, pickupDateTime, and returnDateTime are required' });
        return;
      }

      const pDate = new Date(String(pickupDateTime));
      const rDate = new Date(String(returnDateTime));
      const estKm = estimatedKm ? Number(estimatedKm) : undefined;
      const driverReq = driverRequired === 'true' || driverRequired === '1';

      const quote = await BookingService.calculateQuote(String(vehicleId), pDate, rDate, estKm, driverReq);
      res.status(200).json({ success: true, quote });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const booking = await BookingService.createBooking(req.body, req.user?.userId);
      res.status(201).json({ success: true, booking });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, reason } = req.body;
      const updated = await BookingService.updateStatus(id, status, reason, req.user?.userId);
      res.status(200).json({ success: true, booking: updated });
    } catch (err) {
      next(err);
    }
  }

  static async calendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start, end } = req.query;
      const events = await BookingService.getCalendarEvents(
        start ? String(start) : undefined,
        end ? String(end) : undefined
      );
      res.status(200).json({ success: true, events });
    } catch (err) {
      next(err);
    }
  }
}
