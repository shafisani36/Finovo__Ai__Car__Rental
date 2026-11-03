import { Request, Response, NextFunction } from 'express';
import { InquiryService } from './inquiry.service';

export class InquiryController {
  static async submitInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, subject, message } = req.body;
      const inquiry = await InquiryService.createInquiry({
        name,
        email,
        phone,
        subject,
        message,
      });

      res.status(201).json({
        success: true,
        message: 'Your inquiry has been submitted successfully. Our team will contact you shortly.',
        inquiry,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, page, limit } = req.query;
      const result = await InquiryService.listInquiries({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const inquiry = await InquiryService.getInquiryById(id);
      res.status(200).json({
        success: true,
        inquiry,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      const updated = await InquiryService.updateInquiryStatus(id, status);
      res.status(200).json({
        success: true,
        message: 'Inquiry status updated successfully.',
        inquiry: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async replyToInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { message } = req.body;
      const adminEmail = (req as any).user?.email || 'admin@finovo.com';
      const updated = await InquiryService.replyToInquiry(id, message, adminEmail);

      res.status(200).json({
        success: true,
        message: 'Reply sent and recorded successfully.',
        inquiry: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      await InquiryService.deleteInquiry(id);
      res.status(200).json({
        success: true,
        message: 'Inquiry deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
