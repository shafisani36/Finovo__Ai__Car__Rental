import { z } from 'zod';

// Create feature
export const createCarFeatureSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Feature name must be at least 2 characters')
    .max(100, 'Feature name cannot exceed 100 characters'),

  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(64, 'Category cannot exceed 64 characters'),

  isActive: z.boolean().optional().default(true),
});

// Update feature
export const updateCarFeatureSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    category: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional(),

    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

// List features query
export const carFeatureQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

// TypeScript types
export type CreateCarFeatureInput = z.infer<
  typeof createCarFeatureSchema
>;

export type UpdateCarFeatureInput = z.infer<
  typeof updateCarFeatureSchema
>;