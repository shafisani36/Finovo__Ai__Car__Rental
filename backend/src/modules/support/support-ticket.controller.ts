import { Request, Response, NextFunction } from 'express';
import { SupportTicketService } from './support-ticket.service';

export const SupportTicketController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, ...(await SupportTicketService.list(req.query)) });
    } catch (err) {
      next(err);
    }
  },
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, ticket: await SupportTicketService.get(String(req.params.id)) });
    } catch (err) {
      next(err);
    }
  },
  async reply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await SupportTicketService.reply(String(req.params.id), req.user?.userId, req.body?.message, req.body?.status);
      res.status(201).json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await SupportTicketService.update(String(req.params.id), req.user?.userId, req.body || {});
      res.json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  },
};
