import { Request, Response, NextFunction } from 'express';
import { CustomerPortalService } from './customer-portal.service';

export class CustomerPortalController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.getOverview(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.listBookings(req.user!.userId, req.query);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = await CustomerPortalService.getBookingById(req.user!.userId, id);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const booking = await CustomerPortalService.requestCancellation(req.user!.userId, id, req.body.reason);
      res.status(200).json({ success: true, message: 'Booking cancelled successfully', booking });
    } catch (err) {
      next(err);
    }
  }

  static async extendBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await CustomerPortalService.requestExtension(req.user!.userId, id, req.body.newReturnDateTime);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.getPaymentsSummary(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerPortalService.processPayment(req.user!.userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.listDocuments(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerPortalService.uploadDocument(req.user!.userId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerPortalService.updateProfile(req.user!.userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.listNotifications(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await CustomerPortalService.markNotificationRead(req.user!.userId, id);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CustomerPortalService.markAllNotificationsRead(req.user!.userId);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async listSupportTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tickets = await CustomerPortalService.listSupportTickets(req.user!.userId);
      res.status(200).json({ success: true, tickets });
    } catch (err) {
      next(err);
    }
  }

  static async createSupportTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await CustomerPortalService.createSupportTicket(req.user!.userId, req.body);
      res.status(201).json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  }

  static async replyToSupportTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const message = await CustomerPortalService.replyToSupportTicket(req.user!.userId, id, req.body.message);
      res.status(201).json({ success: true, message });
    } catch (err) {
      next(err);
    }
  }

  static async askAiAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.handleAiAssistant(req.user!.userId, req.body.prompt || '');
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async getRewards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.getRewardsSummary(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async getRentalHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CustomerPortalService.getRentalHistory(req.user!.userId);
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await CustomerPortalService.submitReview(req.user!.userId, req.body);
      res.status(201).json({ success: true, review });
    } catch (err) {
      next(err);
    }
  }
}
