import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { PasswordService } from '../../security/password/password.service';
import { TokenHashService } from '../../security/tokens/token-hash.service';
import { JwtService } from '../../security/tokens/jwt.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../sessions/session.service';
import { RoleService } from '../identity/role.service';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  VerifyCodeInput,
  ResetPasswordInput,
} from './auth.validation';

/** Same answer whether or not the email was already registered (no account enumeration). */
export const REGISTER_RESPONSE_MESSAGE =
  'Thanks! If this email can be used, your account is ready and we have sent a verification link to your inbox.';

const VERIFICATION_TOKEN_HOURS = 24;

export class AuthService {
  /** Creates a fresh single-use email verification link and emails it. Older links stop working. */
  static async issueVerificationEmail(user: { id: string; email: string; fullName: string }) {
    const rawToken = TokenHashService.generateRandomToken(32);
    await prisma.$transaction([
      prisma.verificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: TokenHashService.hashToken(rawToken),
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 60 * 60 * 1000),
        },
      }),
    ]);
    await EmailService.sendVerificationEmail(user.email, rawToken, user.fullName);
  }

  /** Confirms an email address from the link in the verification email. */
  static async verifyEmail(email: string, rawToken: string, ipAddress?: string, userAgent?: string) {
    const invalid = AppError.badRequest('This verification link is invalid or has expired. Please request a new one.');
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: TokenHashService.hashToken(rawToken) },
      include: { user: { select: { id: true, email: true, isEmailVerified: true } } },
    });
    if (!record || record.user.email !== email) throw invalid;
    if (record.user.isEmailVerified) return { alreadyVerified: true };
    if (record.usedAt || record.expiresAt < new Date()) throw invalid;

    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: record.user.id },
        data: { isEmailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);
    await AuditService.log({ userId: record.user.id, event: 'AUTH_EMAIL_VERIFIED', ipAddress, userAgent });
    return { alreadyVerified: false };
  }

  /** Sends a new verification link to a signed-in user who has not confirmed their email yet. */
  static async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, isEmailVerified: true },
    });
    if (!user) throw AppError.notFound('Account not found');
    if (user.isEmailVerified) return { alreadyVerified: true };
    await AuthService.issueVerificationEmail(user);
    return { alreadyVerified: false };
  }

  /** Customers must confirm their email before booking or paying; staff accounts are created verified. */
  static async assertEmailVerified(userId: string | undefined) {
    if (!userId) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isEmailVerified: true } });
    if (user && !user.isEmailVerified) {
      throw new AppError(
        'Please verify your email address before booking. Check your inbox or request a new link from your dashboard.',
        403,
        'EMAIL_NOT_VERIFIED'
      );
    }
  }

  /**
   * Registers a new user with Argon2id password hashing and default least-privilege role
   */
  static async register(input: RegisterInput, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Hash first in both cases so a taken email answers just as slowly as a new one
    const passwordHash = await PasswordService.hashPassword(input.password);

    if (existing) {
      await AuditService.log({
        userId: existing.id,
        event: 'AUTH_REGISTER_DUPLICATE_ATTEMPT',
        ipAddress,
        userAgent,
        metadata: { email: input.email },
      });
      // Tell the real owner by email instead of telling the visitor that the address is registered
      EmailService.sendAccountExistsNotice(existing.email, existing.fullName).catch((err) =>
        console.error('[AuthService] Account-exists notice delivery failed:', err)
      );
      return { created: false as const, message: REGISTER_RESPONSE_MESSAGE };
    }

    // Atomic transaction: create user and assign default role
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          status: 'ACTIVE', // Or PENDING_VERIFICATION if strict email confirmation required before first login
          isEmailVerified: false,
        },
      });

      let customerRole = await tx.role.findUnique({
        where: { name: 'CUSTOMER' },
      });

      if (!customerRole) {
        customerRole = await tx.role.create({
          data: {
            name: 'CUSTOMER',
            description: 'Default verified rental customer',
            isSystem: true,
          },
        });
      }

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: customerRole.id,
        },
      });

      // Generate single-use verification token
      const rawVerificationToken = TokenHashService.generateRandomToken(32);
      const tokenHash = TokenHashService.hashToken(rawVerificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.verificationToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return { newUser, rawVerificationToken };
    });

    // Send verification email asynchronously
    EmailService.sendVerificationEmail(user.newUser.email, user.rawVerificationToken, user.newUser.fullName).catch(
      (err) => console.error('[AuthService] Verification email delivery failed:', err)
    );

    await AuditService.log({
      userId: user.newUser.id,
      event: 'AUTH_REGISTER_SUCCESS',
      ipAddress,
      userAgent,
      metadata: { email: input.email },
    });

    return {
      created: true as const,
      message: REGISTER_RESPONSE_MESSAGE,
      user: {
        id: user.newUser.id,
        email: user.newUser.email,
        fullName: user.newUser.fullName,
        isEmailVerified: user.newUser.isEmailVerified,
      },
    };
  }

  /**
   * Authenticates user, verifies Argon2id hash, issues session & JWT
   */
  static async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Constant-time defense against user enumeration
    if (!user) {
      await PasswordService.verifyPassword('dummy-candidate-pwd', '$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhashdummy');
      await AuditService.log({
        event: 'AUTH_LOGIN_FAILED_UNKNOWN_EMAIL',
        ipAddress,
        userAgent,
        metadata: { email: input.email },
      });
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      await AuditService.log({
        userId: user.id,
        event: 'AUTH_LOGIN_ATTEMPT_SUSPENDED_ACCOUNT',
        ipAddress,
        userAgent,
      });
      throw AppError.forbidden('Your account has been suspended. Please contact Finovo customer support.');
    }

    const isMatch = await PasswordService.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      await AuditService.log({
        userId: user.id,
        event: 'AUTH_LOGIN_FAILED_INVALID_PASSWORD',
        ipAddress,
        userAgent,
      });
      throw AppError.unauthorized('Invalid email or password');
    }

    // Transparent password rehashing if parameters changed
    if (PasswordService.needsRehash(user.passwordHash)) {
      const newHash = await PasswordService.hashPassword(input.password);
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }).catch(() => {});
    }

    // Generate refresh token and create MySQL session
    const { rawToken: rawRefreshToken, tokenHash: refreshTokenHash } = JwtService.generateRefreshToken();
    const durationDays = input.rememberMe ? 30 : 7;

    const { session, rawSessionToken } = await SessionService.createSession({
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      durationDays,
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }
    const permissions = Array.from(permissionSet);

    // Sign short-lived JWT access token
    const accessToken = JwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions,
      sessionId: session.id,
    });

    await AuditService.log({
      userId: user.id,
      event: 'AUTH_LOGIN_SUCCESS',
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id },
    });

    return {
      accessToken,
      rawSessionToken,
      rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        preferredLanguage: user.preferredLanguage || 'en',
        roles,
        permissions,
      },
    };
  }

  /**
   * Refreshes the access token and rotates the refresh token
   */
  static async refresh(rawSessionToken: string, rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!rawSessionToken || !rawRefreshToken) {
      throw AppError.unauthorized('Invalid session credentials');
    }

    const session = await SessionService.findActiveSession(rawSessionToken);
    if (!session) {
      throw AppError.unauthorized('Session expired or revoked. Please sign in again.');
    }

    const candidateHash = TokenHashService.hashToken(rawRefreshToken);
    if (!TokenHashService.timingSafeEqual(candidateHash, session.refreshTokenHash)) {
      // Possible token theft detected! Revoke all sessions for this user immediately!
      await SessionService.revokeAllUserSessions(session.userId, 'REFRESH_TOKEN_REUSE_DETECTED');
      await AuditService.log({
        userId: session.userId,
        event: 'AUTH_SECURITY_ALERT_REFRESH_TOKEN_REUSE',
        ipAddress,
        userAgent,
        metadata: { sessionId: session.id },
      });
      throw AppError.unauthorized('Invalid refresh credential detected. All active sessions have been revoked.');
    }

    // Refresh token rotation: issue new refresh token and update DB
    const { rawToken: newRawRefreshToken, tokenHash: newRefreshTokenHash } = JwtService.generateRefreshToken();
    await SessionService.updateRefreshToken(session.id, newRefreshTokenHash);

    const { roles, permissions } = await RoleService.getUserRolesAndPermissions(session.userId);

    const accessToken = JwtService.signAccessToken({
      sub: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      roles,
      permissions,
      sessionId: session.id,
    });

    return {
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        preferredLanguage: session.user.preferredLanguage || 'en',
        roles,
        permissions,
      },
    };
  }

  /**
   * Logs out the user and revokes their current session
   */
  static async logout(rawSessionToken?: string, ipAddress?: string, userAgent?: string) {
    if (rawSessionToken) {
      const session = await prisma.session.findUnique({
        where: { sessionToken: rawSessionToken },
      });

      if (session) {
        await SessionService.revokeSession(session.id, 'USER_MANUAL_LOGOUT');
        await AuditService.log({
          userId: session.userId,
          event: 'AUTH_LOGOUT_SUCCESS',
          ipAddress,
          userAgent,
        });
      }
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Requests a 6-digit password reset code sent via email
   */
  static async requestPasswordReset(input: ForgotPasswordInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Timing-safe response: Always return success to prevent email enumeration
    if (!user) {
      await AuditService.log({
        event: 'AUTH_PASSWORD_RESET_REQUEST_NONEXISTENT',
        ipAddress,
        userAgent,
        metadata: { email: input.email },
      });
      return {
        message: 'If an account with that email exists, a 6-digit verification code has been sent.',
      };
    }

    // Invalidate existing unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = TokenHashService.generateNumericOtp(6);
    const codeHash = TokenHashService.hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Send email with the 6-digit OTP
    EmailService.sendPasswordResetOtp(user.email, rawOtp, user.fullName).catch((err) =>
      console.error('[AuthService] Reset OTP email delivery failed:', err)
    );

    await AuditService.log({
      userId: user.id,
      event: 'AUTH_PASSWORD_RESET_REQUESTED',
      ipAddress,
      userAgent,
      metadata: { email: input.email },
    });

    return {
      message: 'If an account with that email exists, a 6-digit verification code has been sent.',
    };
  }

  /**
   * Validates a 6-digit code without resetting the password yet
   */
  static async verifyResetCode(input: VerifyCodeInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw AppError.badRequest('Invalid or expired verification code');
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetToken) {
      throw AppError.badRequest('Invalid or expired verification code');
    }

    if (resetToken.attempts >= 5) {
      throw AppError.badRequest('Too many incorrect verification attempts. Please request a new code.');
    }

    const candidateHash = TokenHashService.hashToken(input.code);
    const isValid = TokenHashService.timingSafeEqual(candidateHash, resetToken.codeHash);

    if (!isValid) {
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppError.badRequest('Invalid verification code. Please check and try again.');
    }

    return { valid: true, message: 'Code verified successfully' };
  }

  /**
   * Resets password using the verified code and terminates all existing sessions
   */
  static async resetPassword(input: ResetPasswordInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw AppError.badRequest('Invalid or expired verification code');
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetToken) {
      throw AppError.badRequest('Invalid or expired verification code');
    }

    if (resetToken.attempts >= 5) {
      throw AppError.badRequest('Too many incorrect verification attempts. Please request a new code.');
    }

    const candidateHash = TokenHashService.hashToken(input.code);
    if (!TokenHashService.timingSafeEqual(candidateHash, resetToken.codeHash)) {
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppError.badRequest('Invalid verification code');
    }

    // Hash new password with Argon2id
    const newPasswordHash = await PasswordService.hashPassword(input.newPassword);

    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      // Invalidate the reset token
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all existing sessions for this user for security
      prisma.session.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'PASSWORD_RESET',
        },
      }),
    ]);

    await AuditService.log({
      userId: user.id,
      event: 'AUTH_PASSWORD_RESET_SUCCESS',
      ipAddress,
      userAgent,
      metadata: { email: input.email },
    });

    return { message: 'Password has been successfully updated. You may now sign in with your new password.' };
  }

  /**
   * Retrieves current user profile omitting sensitive fields
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        isEmailVerified: true,
        status: true,
        preferredLanguage: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                description: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      preferredLanguage: user.preferredLanguage || 'en',
      createdAt: user.createdAt,
      roles,
      permissions: Array.from(permissionSet),
    };
  }
}
