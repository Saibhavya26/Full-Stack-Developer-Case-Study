import { z } from 'zod';

export const customerTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']);
export const customerStatusEnum = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z
    .string()
    .min(7, 'Mobile number looks too short')
    .max(20, 'Mobile number looks too long'),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: customerTypeEnum.default('RETAIL'),
  address: z.string().optional(),
  status: customerStatusEnum.default('LEAD'),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: customerStatusEnum.optional(),
  customerType: customerTypeEnum.optional(),
});

export const createFollowUpSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty'),
  nextDate: z.coerce.date().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
