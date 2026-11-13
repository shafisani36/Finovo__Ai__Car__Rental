import { AppError } from '../../shared/errors/app-error';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';

export class SessionController {
  static async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
        return;
      }

      const sessions = await SessionService.listUserSessions(req.user.userId, req.user.sessionId);
      res.status(200).json({ success: true, sessions });
    } catch (err) {
      next(err);
    }
  }

  static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
      // A user may only sign out their own devices
      const owned = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.userId }, select: { id: true } });
      if (!owned) {
        throw AppError.notFound('Session not found');
      }
      await SessionService.revokeSession(sessionId, 'USER_MANUAL_REVOKE');
      res.status(200).json({ success: true, message: 'Session revoked successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async revokeOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
        return;
      }

      await SessionService.revokeOtherUserSessions(req.user.userId, req.user.sessionId);
      res.status(200).json({ success: true, message: 'All other sessions have been revoked' });
    } catch (err) {
      next(err);
    }
  }
}
