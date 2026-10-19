import { prisma } from '../../infrastructure/prisma/prisma.client';

export interface AuditLogParams {
  userId?: string | null;
  event: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Records a security event in the database
   */
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.securityAuditLog.create({
        data: {
          userId: params.userId || null,
          event: params.event,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
    } catch (err) {
      // Non-blocking error logging for audit failures
      console.error('[AuditService] Failed to record security event:', err);
    }
  }
}
