import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import type {
  CreateCarFeatureInput,
  UpdateCarFeatureInput,
} from './car-feature.validation';

export class CarFeatureService {
  // Get all features
  static async list(activeOnly = false) {
    return prisma.carFeature.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
    });
  }

  // Create feature
  static async create(data: CreateCarFeatureInput) {
    const name = data.name.trim();
    const category = data.category.trim();

    const existing = await prisma.carFeature.findFirst({
      where: {
        name: { equals: name },
        category: { equals: category },
      },
    });

    if (existing) {
      throw new AppError(
        'This feature already exists in this category.',
        409
      );
    }

    return prisma.carFeature.create({
      data: {
        name,
        category,
        isActive: data.isActive,
      },
    });
  }

  // Update feature
  static async update(id: string, data: UpdateCarFeatureInput) {
    const existing = await prisma.carFeature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Car feature not found.', 404);
    }

    const name = data.name?.trim() ?? existing.name;
    const category = data.category?.trim() ?? existing.category;

    const duplicate = await prisma.carFeature.findFirst({
      where: {
        name: { equals: name },
        category: { equals: category },
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new AppError(
        'Another feature with this name already exists in this category.',
        409
      );
    }

    return prisma.carFeature.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name }),
        ...(data.category !== undefined && { category }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),
      },
    });
  }

  // Activate / deactivate feature
  static async updateStatus(id: string, isActive: boolean) {
    const existing = await prisma.carFeature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Car feature not found.', 404);
    }

    return prisma.carFeature.update({
      where: { id },
      data: { isActive },
    });
  }

  // Delete feature
  static async delete(id: string) {
    const existing = await prisma.carFeature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Car feature not found.', 404);
    }

    await prisma.carFeature.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Car feature deleted successfully.',
    };
  }
}