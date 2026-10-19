import { prisma } from '../../infrastructure/prisma/prisma.client';
import { TokenHashService } from '../../security/tokens/token-hash.service';

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationDays?: number;
}

export class SessionService {
  /**
   * Creates a new persistent server session in MySQL
   */
  static async createSession(input: CreateSessionInput) {
    const sessionToken = TokenHashService.generateRandomToken(32);
    const durationDays = input.durationDays || 7;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: input.userId,
        sessionToken,
        refreshTokenHash: input.refreshTokenHash,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    return { session, rawSessionToken: sessionToken };
  }

  /**
   * Retrieves an active session by sessionToken
   */
  static async findActiveSession(sessionToken: string) {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
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
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return null;
    }

    // Touch lastActiveAt (throttled by 5 minutes to avoid excessive DB writes)
    if (Date.now() - session.lastActiveAt.getTime() > 5 * 60 * 1000) {
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }

    return session;
  }

  /**
   * Updates a session's refresh token hash during rotation
   */
  static async updateRefreshToken(sessionId: string, newRefreshTokenHash: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Revokes a single session
   */
  static async revokeSession(sessionId: string, reason = 'USER_LOGOUT') {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Revokes all sessions for a user (e.g. on password reset or account compromise)
   */
  static async revokeAllUserSessions(userId: string, reason = 'SECURITY_RESET') {
    return prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Revokes all sessions for a user EXCEPT the current session
   */
  static async revokeOtherUserSessions(userId: string, currentSessionId: string) {
    return prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'USER_REVOKED_OTHER_SESSIONS',
      },
    });
  }

  /**
   * Lists all active sessions for a user
   */
  static async listUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  }
}
