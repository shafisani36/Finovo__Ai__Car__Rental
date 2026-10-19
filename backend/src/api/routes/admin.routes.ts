import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { prisma } from '../../infrastructure/prisma/prisma.client';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// List system audit logs for administrative review
adminRouter.get('/audit-logs', async (_req: Request, res: Response) => {
  const logs = await prisma.securityAuditLog.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  res.status(200).json({ success: true, logs });
});

// List users for administrative management
adminRouter.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  const formatted = users.map((u) => ({
    ...u,
    roles: u.userRoles.map((r) => r.role.name),
  }));

  res.status(200).json({ success: true, users: formatted });
});
