import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  cancelChallanHandler,
  confirmChallanHandler,
  createChallanHandler,
  getChallanHandler,
  listChallansHandler,
} from './challans.controller';
import { createChallanSchema, listChallansQuerySchema } from './challans.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate(listChallansQuerySchema, 'query'), listChallansHandler);
router.get('/:id', getChallanHandler);
router.post('/', requireRole('SALES'), validate(createChallanSchema), createChallanHandler);
router.post('/:id/confirm', requireRole('SALES'), confirmChallanHandler);
router.post('/:id/cancel', requireRole('SALES', 'ACCOUNTS'), cancelChallanHandler);

export default router;
