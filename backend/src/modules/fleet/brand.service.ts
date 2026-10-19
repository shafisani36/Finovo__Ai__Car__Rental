import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';

const prisma = new PrismaClient();

export class BrandService {
  private static uploadsDir = path.join(process.cwd(), 'uploads', 'brands');

  /**
   * Ensures the uploads/brands directory exists on disk
   */
  private static ensureBrandsUploadDir(): string {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    return this.uploadsDir;
  }

  /**
   * Validates and saves base64 brand logo to disk under uploads/brands/
   */
  static saveBase64Logo(dataUrl: string, slug?: string): string {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }

    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw AppError.badRequest('Invalid base64 logo image format.');
    }

    const rawSubtype = matches[1].toLowerCase();
    const base64Data = matches[2];

    const ALLOWED_MIME: Record<string, string> = {
      'png': 'png',
      'jpeg': 'jpg',
      'jpg': 'jpg',
      'webp': 'webp',
      'svg+xml': 'svg',
      'svg': 'svg',
    };

    const ext = ALLOWED_MIME[rawSubtype];
    if (!ext) {
      throw AppError.badRequest(
        `Unsupported logo format (image/${rawSubtype}). Supported formats: PNG, JPG, WEBP, SVG.`
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_LOGO_SIZE) {
      throw AppError.badRequest(
        `Brand logo exceeds 5MB size limit (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Please choose an optimized logo.`
      );
    }

    const dir = this.ensureBrandsUploadDir();
    const fileId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const safeSlug = (slug || 'brand').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
    const filename = `brand-${safeSlug}-${Date.now()}-${fileId}.${ext}`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/brands/${filename}`;
  }

  static async listBrands(query?: { search?: string; isActive?: boolean }) {
    const where: any = {};
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { country: { contains: query.search } },
      ];
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return prisma.vehicleBrand.findMany({
      where,
      include: {
        models: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { models: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getBrandById(id: string) {
    return prisma.vehicleBrand.findUnique({
      where: { id },
      include: {
        models: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  static async createBrand(data: { name: string; country?: string; logoUrl?: string }) {
    const cleanName = data.name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let finalLogoUrl: string | null = null;
    if (data.logoUrl && data.logoUrl.trim()) {
      const trimmed = data.logoUrl.trim();
      if (trimmed.startsWith('data:image/')) {
        finalLogoUrl = this.saveBase64Logo(trimmed, slug);
      } else if (trimmed.startsWith('/uploads/')) {
        finalLogoUrl = trimmed;
      }
    }

    return prisma.vehicleBrand.create({
      data: {
        name: cleanName,
        slug,
        country: data.country?.trim() || null,
        logoUrl: finalLogoUrl,
        isActive: true,
      },
      include: {
        models: true,
      },
    });
  }

  static async updateBrand(id: string, data: { name?: string; country?: string; logoUrl?: string; isActive?: boolean }) {
    const updateData: any = { ...data };
    if (data.name) {
      updateData.name = data.name.trim();
      updateData.slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (data.logoUrl !== undefined) {
      let finalLogoUrl: string | null = null;
      if (data.logoUrl && data.logoUrl.trim()) {
        const trimmed = data.logoUrl.trim();
        if (trimmed.startsWith('data:image/')) {
          finalLogoUrl = this.saveBase64Logo(trimmed, updateData.slug || id);
        } else if (trimmed.startsWith('/uploads/')) {
          finalLogoUrl = trimmed;
        }
      }
      updateData.logoUrl = finalLogoUrl;
    }
    return prisma.vehicleBrand.update({
      where: { id },
      data: updateData,
      include: {
        models: true,
      },
    });
  }

  static async deleteBrand(id: string) {
    return prisma.vehicleBrand.delete({
      where: { id },
    });
  }

  // ==========================================
  // MODELS CRUD
  // ==========================================
  static async listModels(query?: { search?: string; brandId?: string; bodyType?: string; isActive?: boolean }) {
    const where: any = {};

    if (query?.brandId) {
      where.brandId = query.brandId;
    }

    if (query?.bodyType) {
      where.bodyType = query.bodyType;
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { brand: { name: { contains: query.search } } },
        { bodyType: { contains: query.search } },
      ];
    }

    return prisma.vehicleModel.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            country: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { brand: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  static async getModelById(id: string) {
    return prisma.vehicleModel.findUnique({
      where: { id },
      include: {
        brand: true,
      },
    });
  }

  static async createModel(
    brandId: string,
    data: { name: string; bodyType?: string; defaultCategoryId?: string }
  ) {
    const cleanName = data.name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return prisma.vehicleModel.create({
      data: {
        brandId,
        name: cleanName,
        slug,
        bodyType: data.bodyType || 'Sedan',
        defaultCategoryId: data.defaultCategoryId || null,
        isActive: true,
      },
      include: {
        brand: true,
      },
    });
  }

  static async updateModel(
    id: string,
    data: { name?: string; brandId?: string; bodyType?: string; isActive?: boolean; defaultCategoryId?: string }
  ) {
    const updateData: any = { ...data };
    if (data.name) {
      updateData.name = data.name.trim();
      updateData.slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    return prisma.vehicleModel.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
      },
    });
  }

  static async deleteModel(id: string) {
    return prisma.vehicleModel.delete({
      where: { id },
    });
  }
}

