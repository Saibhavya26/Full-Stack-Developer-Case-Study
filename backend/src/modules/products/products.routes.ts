import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  adjustStockHandler,
  createProductHandler,
  getProductHandler,
  listProductsHandler,
  updateProductHandler,
} from './products.controller';
import {
  adjustStockSchema,
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from './products.schema';

const router = Router();

router.use(authenticate);

// Everyone can view the catalog; only Warehouse/Admin can mutate it.
router.get('/', validate(listProductsQuerySchema, 'query'), listProductsHandler);
router.get('/:id', getProductHandler);
router.post('/', requireRole('WAREHOUSE'), validate(createProductSchema), createProductHandler);
router.patch(
  '/:id',
  requireRole('WAREHOUSE'),
  validate(updateProductSchema),
  updateProductHandler
);
router.post(
  '/:id/stock-movements',
  requireRole('WAREHOUSE'),
  validate(adjustStockSchema),
  adjustStockHandler
);

export default router;
