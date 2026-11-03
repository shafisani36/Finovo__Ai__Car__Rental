import { Request, Response, NextFunction } from 'express';
import { BrandService } from './brand.service';
import { VinService } from './vin.service';

export class BrandController {
  static async listBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const brands = await BrandService.listBrands({ search, isActive });
      res.status(200).json({
        success: true,
        brands,
        total: brands.length,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const brand = await BrandService.getBrandById(id);
      if (!brand) {
        return res.status(404).json({ success: false, message: 'Brand not found' });
      }
      res.status(200).json({ success: true, brand });
    } catch (err) {
      next(err);
    }
  }

  static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, name } = req.body;
      if (!data || typeof data !== 'string' || !data.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Valid image base64 data URL is required' });
      }
      const cleanName = (name && typeof name === 'string' ? name : 'brand').trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const logoUrl = BrandService.saveBase64Logo(data, slug);
      res.status(200).json({
        success: true,
        logoUrl,
        message: 'Brand logo uploaded successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async createBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, country, logoUrl } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'Brand name is required' });
      }

      const brand = await BrandService.createBrand({ name, country, logoUrl });
      res.status(201).json({
        success: true,
        message: 'Brand created successfully',
        brand,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'A brand with this name already exists' });
      }
      next(err);
    }
  }

  static async updateBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { name, country, logoUrl, isActive } = req.body;

      const brand = await BrandService.updateBrand(id, { name, country, logoUrl, isActive });
      res.status(200).json({
        success: true,
        message: 'Brand updated successfully',
        brand,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Brand name conflicts with existing brand' });
      }
      next(err);
    }
  }

  static async deleteBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      await BrandService.deleteBrand(id);
      res.status(200).json({
        success: true,
        message: 'Brand and associated models deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // MODELS
  // ==========================================
  static async listModels(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const brandId = req.query.brandId as string | undefined;
      const bodyType = req.query.bodyType as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const models = await BrandService.listModels({ search, brandId, bodyType, isActive });
      res.status(200).json({
        success: true,
        models,
        total: models.length,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getModel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const model = await BrandService.getModelById(id);
      if (!model) {
        return res.status(404).json({ success: false, message: 'Model not found' });
      }
      res.status(200).json({ success: true, model });
    } catch (err) {
      next(err);
    }
  }

  static async createModel(req: Request, res: Response, next: NextFunction) {
    try {
      const brandId = req.params.brandId || req.body.brandId;
      const { name, bodyType, defaultCategoryId } = req.body;

      if (!brandId || typeof brandId !== 'string') {
        return res.status(400).json({ success: false, message: 'Brand is required' });
      }

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'Model name is required' });
      }

      const model = await BrandService.createModel(brandId, {
        name,
        bodyType,
        defaultCategoryId,
      });

      res.status(201).json({
        success: true,
        message: 'Model created successfully',
        model,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'This model already exists for this brand' });
      }
      next(err);
    }
  }

  static async updateModel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { name, brandId, bodyType, defaultCategoryId, isActive } = req.body;

      const model = await BrandService.updateModel(id, {
        name,
        brandId,
        bodyType,
        defaultCategoryId,
        isActive,
      });

      res.status(200).json({
        success: true,
        message: 'Model updated successfully',
        model,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Model name conflicts with another model of this brand' });
      }
      next(err);
    }
  }

  static async deleteModel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      await BrandService.deleteModel(id);
      res.status(200).json({
        success: true,
        message: 'Model deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // VIN DECODER
  // ==========================================
  static async decodeVin(req: Request, res: Response, next: NextFunction) {
    try {
      const vin = String(req.params.vin);
      const specs = await VinService.decodeVin(vin);
      res.status(200).json({
        success: true,
        specs,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to decode VIN',
      });
    }
  }
}
