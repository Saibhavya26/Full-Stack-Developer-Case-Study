import { z } from 'zod';

export const challanItemInputSchema = z.object({
  productId: z.string().uuid('productId must be a valid product id'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('customerId must be a valid customer id'),
  items: z.array(challanItemInputSchema).min(1, 'A challan needs at least one product line'),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});

export const updateChallanItemsSchema = z.object({
  items: z.array(challanItemInputSchema).min(1, 'A challan needs at least one product line'),
});

export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanItemsInput = z.infer<typeof updateChallanItemsSchema>;
