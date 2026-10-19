import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.config';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  resetPasswordSchema,
} from './auth.validation';

export class AuthController {
  private static setAuthCookies(
    res: Response,
    sessionToken: string,
    refreshToken: string,
    rememberMe = false
  ) {
    const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;

    res.cookie(env.COOKIE.SESSION_NAME, sessionToken, {
      httpOnly: true,
      secure: env.COOKIE.SECURE,
      sameSite: env.COOKIE.SAME_SITE,
      domain: env.COOKIE.DOMAIN,
      maxAge,
      path: '/',
    });

    res.cookie(env.COOKIE.REFRESH_NAME, refreshToken, {
      httpOnly: true,
      secure: env.COOKIE.SECURE,
      sameSite: env.COOKIE.SAME_SITE,
      domain: env.COOKIE.DOMAIN,
      maxAge,
      path: '/',
    });
  }

  private static clearAuthCookies(res: Response) {
    res.clearCookie(env.COOKIE.SESSION_NAME, {
      httpOnly: true,
      secure: env.COOKIE.SECURE,
      sameSite: env.COOKIE.SAME_SITE,
      domain: env.COOKIE.DOMAIN,
      path: '/',
    });
    res.clearCookie(env.COOKIE.REFRESH_NAME, {
      httpOnly: true,
      secure: env.COOKIE.SECURE,
      sameSite: env.COOKIE.SAME_SITE,
      domain: env.COOKIE.DOMAIN,
      path: '/',
    });
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.register(validated, ip, userAgent);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.login(validated, ip, userAgent);

      AuthController.setAuthCookies(
        res,
        result.rawSessionToken,
        result.rawRefreshToken,
        validated.rememberMe
      );

      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        sessionToken: result.rawSessionToken,
        refreshToken: result.rawRefreshToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionToken = req.cookies[env.COOKIE.SESSION_NAME] || req.body.sessionToken;
      const refreshToken = req.cookies[env.COOKIE.REFRESH_NAME] || req.body.refreshToken;

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.refresh(sessionToken, refreshToken, ip, userAgent);

      if (sessionToken) {
        AuthController.setAuthCookies(res, sessionToken, result.rawRefreshToken);
      }

      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.rawRefreshToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionToken = req.cookies[env.COOKIE.SESSION_NAME] || req.body.sessionToken;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.logout(sessionToken, ip, userAgent);
      AuthController.clearAuthCookies(res);

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.requestPasswordReset(validated, ip, userAgent);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async verifyResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyCodeSchema.parse(req.body);
      const result = await AuthService.verifyResetCode(validated);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.resetPassword(validated, ip, userAgent);
      AuthController.clearAuthCookies(res);

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
        return;
      }

      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
}
