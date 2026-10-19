import { Router, Request, Response } from 'express';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const branchRouter = Router();

// List all active branches (public/authenticated)
branchRouter.get('/', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { vehicles: true } },
    },
  });

  res.status(200).json({ success: true, branches });
});

branchRouter.get('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      vehicles: {
        include: { category: true },
      },
    },
  });

  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }

  res.status(200).json({ success: true, branch });
});

branchRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { name, code, city, address, phone, email, openingHours } = req.body;
    const branch = await prisma.branch.create({
      data: { name, code, city, address, phone, email, openingHours },
    });
    res.status(201).json({ success: true, branch });
  }
);
