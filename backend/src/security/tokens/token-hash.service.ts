import crypto from 'crypto';

export class TokenHashService {
  /**
   * Hashes a token using SHA-256 with optional pepper
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically secure random hexadecimal token
   */
  static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generates a cryptographically secure numeric OTP code (e.g. 6-digit code for password reset)
   */
  static generateNumericOtp(digits = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const value = crypto.randomInt(min, max + 1);
    return value.toString();
  }

  /**
   * Performs constant-time comparison between two strings
   */
  static timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
