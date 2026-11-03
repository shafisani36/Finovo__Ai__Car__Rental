import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtUserPayload } from '../security/tokens/jwt.service';
import { prisma } from '../infrastructure/prisma/prisma.client';
import { AppError } from '../shared/errors/app-error';

export interface AuthenticatedUser extends JwtUserPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      throw AppError.unauthorized('No access token provided. Please authenticate.');
    }

    // 2. Verify JWT signature and payload
    let decoded: JwtUserPayload;
    try {
      decoded = JwtService.verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Access token has expired or is invalid.');
    }

    // 3. Verify session in MySQL is still valid and not revoked
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      select: { isRevoked: true, expiresAt: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw AppError.unauthorized('Session has been revoked or expired. Please sign in again.');
    }

    req.user = {
      ...decoded,
      userId: decoded.sub,
    };

    next();
  } catch (err) {
    next(err);
  }
}
