import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  addFollowUpHandler,
  createCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from './customers.controller';
import {
  createCustomerSchema,
  createFollowUpSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customers.schema';

const router = Router();

router.use(authenticate);

// Sales and Admin manage customers; Warehouse/Accounts have read-only access.
router.get('/', validate(listCustomersQuerySchema, 'query'), listCustomersHandler);
router.get('/:id', getCustomerHandler);
router.post('/', requireRole('SALES'), validate(createCustomerSchema), createCustomerHandler);
router.patch('/:id', requireRole('SALES'), validate(updateCustomerSchema), updateCustomerHandler);
router.post(
  '/:id/follow-ups',
  requireRole('SALES'),
  validate(createFollowUpSchema),
  addFollowUpHandler
);

export default router;
