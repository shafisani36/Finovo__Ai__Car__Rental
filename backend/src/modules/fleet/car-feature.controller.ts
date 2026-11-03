import { Request, Response, NextFunction } from 'express';
import { CarFeatureService } from './car-feature.service';
import {
  createCarFeatureSchema,
  updateCarFeatureSchema,
  carFeatureQuerySchema,
} from './car-feature.validation';
import { z } from 'zod';

export class CarFeatureController {
  // Get all features
  static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = carFeatureQuerySchema.parse(req.query);

      const features = await CarFeatureService.list(
        query.activeOnly === 'true'
      );

      res.status(200).json({
        success: true,
        features,
      });
    } catch (err) {
      next(err);
    }
  }

  // Create feature
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = createCarFeatureSchema.parse(req.body);
      const feature = await CarFeatureService.create(data);

      res.status(201).json({
        success: true,
        message: 'Car feature created successfully.',
        feature,
      });
    } catch (err) {
      next(err);
    }
  }

  // Update feature
  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const data = updateCarFeatureSchema.parse(req.body);
      const feature = await CarFeatureService.update(id, data);

      res.status(200).json({
        success: true,
        message: 'Car feature updated successfully.',
        feature,
      });
    } catch (err) {
      next(err);
    }
  }

  // Activate / Deactivate feature
  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const validated = z.object({
        isActive: z.boolean(),
      }).parse(req.body);

      const feature = await CarFeatureService.updateStatus(
        id,
        validated.isActive
      );

      res.status(200).json({
        success: true,
        message: 'Car feature status updated successfully.',
        feature,
      });
    } catch (err) {
      next(err);
    }
  }

  // Delete feature
  static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const result = await CarFeatureService.delete(id);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}