import argon2 from 'argon2';
import { env } from '../../config/env.config';

export class PasswordService {
  private static readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: env.ARGON2.MEMORY_COST,
    timeCost: env.ARGON2.TIME_COST,
    parallelism: env.ARGON2.PARALLELISM,
  };

  /**
   * Hashes a plaintext password using Argon2id with secure salt and memory parameters
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  /**
   * Verifies a candidate password against an Argon2id hash using constant-time comparison
   */
  static async verifyPassword(candidate: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, candidate);
    } catch {
      return false;
    }
  }

  /**
   * Determines if the password hash was generated with outdated hashing parameters
   */
  static needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, this.options);
  }
}
