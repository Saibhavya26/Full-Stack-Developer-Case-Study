import { Router } from 'express';
import { loginHandler, meHandler } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

// POST /auth/login - public
router.post('/login', validate(loginSchema), loginHandler);

// GET /auth/me - returns the currently authenticated user
router.get('/me', authenticate, meHandler);

export default router;
