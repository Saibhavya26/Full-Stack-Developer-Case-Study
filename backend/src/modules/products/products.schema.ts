import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative'),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  minStockAlertQty: z.coerce.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const adjustStockSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'A reason is required for every stock movement'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
