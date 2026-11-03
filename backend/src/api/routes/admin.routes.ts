import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { InquiryController } from '../../modules/inquiries/inquiry.controller';
import { PasswordService } from '../../security/password/password.service';
import { AppError } from '../../shared/errors/app-error';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// ==========================================
// 1. INQUIRIES MANAGEMENT
// ==========================================
adminRouter.get('/inquiries', InquiryController.listInquiries);
adminRouter.get('/inquiries/:id', InquiryController.getInquiry);
adminRouter.patch('/inquiries/:id/status', InquiryController.updateStatus);
adminRouter.post('/inquiries/:id/reply', InquiryController.replyToInquiry);
adminRouter.delete('/inquiries/:id', InquiryController.deleteInquiry);

// ==========================================
// 2. AUDIT TRAIL
// ==========================================
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

// ==========================================
// 3. USER MANAGEMENT (CRUD)
// ==========================================

// List users with search and pagination
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, role, page, limit } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      where.OR = [
        { fullName: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
      ];
    }

    if (role && typeof role === 'string' && role !== 'ALL') {
      where.userRoles = {
        some: {
          role: { name: role },
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            select: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
          customerProfile: {
            select: {
              id: true,
              driverLicenseNumber: true,
              isLicenseVerified: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      ...u,
      roles: u.userRoles.map((r) => r.role.name),
    }));

    res.status(200).json({
      success: true,
      users: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get single user by ID
adminRouter.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: { id: true, name: true, description: true },
            },
          },
        },
        customerProfile: {
          select: {
            id: true,
            driverLicenseNumber: true,
            licenseExpiryDate: true,
            isLicenseVerified: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound(`User with ID ${userId} not found.`);
    }

    res.status(200).json({
      success: true,
      user: {
        ...user,
        roles: user.userRoles.map((r) => r.role.name),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Create new user (Admin provisioned)
adminRouter.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, password, phone, role } = req.body;

    if (!email || !fullName || !password) {
      throw AppError.badRequest('Email, Full Name, and Password are required.');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw AppError.conflict('A user account with this email address already exists.');
    }

    // Role assignment: default CUSTOMER unless specified
    const targetRoleName = role || 'CUSTOMER';
    const roleRecord = await prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!roleRecord) {
      throw AppError.badRequest(`Role '${targetRoleName}' does not exist.`);
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(String(password));

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName: String(fullName).trim(),
          phone: phone ? String(phone).trim() : null,
          passwordHash,
          status: 'ACTIVE',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: roleRecord.id,
        },
      });

      if (targetRoleName === 'CUSTOMER') {
        await tx.customer.create({
          data: {
            userId: newUser.id,
            email: normalizedEmail,
            fullName: String(fullName).trim(),
            phone: phone ? String(phone).trim() : null,
          },
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        roles: [targetRoleName],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update user details & status
adminRouter.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone, status, role, password } = req.body;
    const userId = String(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw AppError.notFound(`User with ID ${userId} not found.`);
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (status !== undefined) {
      const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'];
      if (!validStatuses.includes(status)) {
        throw AppError.badRequest(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      updateData.status = status;
    }
    if (password && String(password).trim().length >= 8) {
      updateData.passwordHash = await PasswordService.hashPassword(String(password).trim());
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: updateData,
        });
      }

      // Role update if provided
      if (role) {
        const roleRecord = await tx.role.findUnique({ where: { name: role } });
        if (!roleRecord) {
          throw AppError.badRequest(`Role '${role}' does not exist.`);
        }

        // Remove old roles and assign new role
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({
          data: {
            userId,
            roleId: roleRecord.id,
          },
        });
      }
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        isEmailVerified: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        ...refreshed,
        roles: refreshed?.userRoles.map((r: { role: { name: string } }) => r.role.name) || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Delete user account (with protection against deleting current admin)
adminRouter.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = (req as any).user?.id;
    const targetUserId = String(req.params.id);

    if (currentUserId && currentUserId === targetUserId) {
      throw AppError.badRequest('You cannot delete your own administrative account.');
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw AppError.notFound(`User with ID ${targetUserId} not found.`);
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    res.status(200).json({
      success: true,
      message: 'User account removed successfully.',
    });
  } catch (err) {
    next(err);
  }
});
