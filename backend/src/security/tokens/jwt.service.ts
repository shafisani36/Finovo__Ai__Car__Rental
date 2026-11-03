import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { TokenHashService } from './token-hash.service';

export interface JwtUserPayload {
  sub: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  jti?: string;
}

export class JwtService {
  /**
   * Signs a short-lived access JWT token
   */
  static signAccessToken(payload: Omit<JwtUserPayload, 'jti'>): string {
    const jti = TokenHashService.generateRandomToken(16);
    return jwt.sign({ ...payload, jti }, env.JWT.ACCESS_SECRET, {
      expiresIn: env.JWT.ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
      issuer: 'finovo-auth',
      audience: 'finovo-api',
    });
  }

  /**
   * Verifies and decodes an access JWT token
   */
  static verifyAccessToken(token: string): JwtUserPayload {
    return jwt.verify(token, env.JWT.ACCESS_SECRET, {
      issuer: 'finovo-auth',
      audience: 'finovo-api',
    }) as JwtUserPayload;
  }

  /**
   * Generates a refresh token pair: raw token for client cookie + hash for DB storage
   */
  static generateRefreshToken(): { rawToken: string; tokenHash: string } {
    const rawToken = TokenHashService.generateRandomToken(48);
    const tokenHash = TokenHashService.hashToken(rawToken);
    return { rawToken, tokenHash };
  }
}
