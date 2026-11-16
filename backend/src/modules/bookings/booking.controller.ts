import { Request, Response, NextFunction } from 'express';
import { BookingService, BOOKING_ADDON_CATALOG } from './booking.service';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { isStaffUser } from '../../middleware/authenticate';
import { CustomerPortalService } from '../customers/customer-portal.service';

let lastExpirySweep = 0;

export class BookingController {
  /** Customers only ever see their own bookings; staff see everything. */
  private static async ownCustomerId(req: Request): Promise<string | null> {
    if (isStaffUser(req.user)) return null;
    const customer = await prisma.customer.findFirst({ where: { userId: req.user!.userId }, select: { id: true } });
    // A user without a customer profile owns no bookings: match nothing
    return customer?.id ?? '__no_customer_profile__';
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownCustomerId = await BookingController.ownCustomerId(req);
      // Close checkouts that were abandoned without payment (at most once a minute)
      if (Date.now() - lastExpirySweep > 60_000) {
        lastExpirySweep = Date.now();
        await CustomerPortalService.expireAbandonedCheckouts();
      }
      const filters = ownCustomerId ? { ...req.query, customerId: ownCustomerId } : req.query;
      const result = await BookingService.listBookings(filters);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const ownCustomerId = await BookingController.ownCustomerId(req);
      const booking = await BookingService.getById(id);
      if (ownCustomerId && booking.customerId !== ownCustomerId) {
        // Same answer as a missing booking so ids cannot be probed
        throw AppError.notFound('Booking not found');
      }
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
      const { vehicleId, pickupDateTime, returnDateTime, estimatedKm, driverRequired, addons } = req.query;
      if (!vehicleId || !pickupDateTime || !returnDateTime) {
        res.status(400).json({ success: false, message: 'vehicleId, pickupDateTime, and returnDateTime are required' });
        return;
      }

      const pDate = new Date(String(pickupDateTime));
      const rDate = new Date(String(returnDateTime));
      const estKm = estimatedKm ? Number(estimatedKm) : undefined;
      const driverReq = driverRequired === 'true' || driverRequired === '1';

      const addonCodes = typeof addons === 'string' && addons.trim() ? addons.split(',') : [];

      // Promo code limits and reward points depend on who the booking is for
      let customerId: string | null = null;
      if (req.user) {
        if (isStaffUser(req.user)) {
          customerId = typeof req.query.customerId === 'string' && req.query.customerId ? req.query.customerId : null;
        } else {
          const customer = await prisma.customer.findFirst({ where: { userId: req.user.userId }, select: { id: true } });
          customerId = customer?.id ?? null;
        }
      }

      const [quote, availability] = await Promise.all([
        BookingService.calculateQuote(String(vehicleId), pDate, rDate, estKm, driverReq, addonCodes, {
          promoCode: req.query.promoCode,
          pointsToRedeem: req.query.points,
          deliveryAddress: req.query.deliveryAddress,
          collectionAddress: req.query.collectionAddress,
          customerId,
        }),
        BookingService.checkAvailability(String(vehicleId), pDate, rDate),
      ]);
      res.status(200).json({
        success: true,
        quote,
        availability,
        addonCatalog: Object.values(BOOKING_ADDON_CATALOG),
      });
    } catch (err) {
      next(err);
    }
  }

  /** Delivery fee, reward point and cancellation rules, so the checkout can explain them. */
  static options(_req: Request, res: Response): void {
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).json({ success: true, options: BookingService.publicOptions() });
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const booking = await BookingService.createBooking(req.body, {
        userId: req.user?.userId,
        roles: req.user?.roles,
      });
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
