import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { AuthUser } from '../types/express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

/**
 * Verifies the Bearer JWT on the request and attaches the decoded user to
 * req.user. Any downstream role check relies on this having run first.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
    req.user = user;
    next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Role gate. Usage: router.post('/', authenticate, requireRole('ADMIN', 'SALES'), handler)
 * Admin is treated as implicitly allowed wherever any other role is
 * required, since Admin is the superuser role for this portal.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (req.user.role === 'ADMIN' || allowed.includes(req.user.role)) {
      return next();
    }
    return next(
      ApiError.forbidden(
        `This action requires one of the following roles: ${allowed.join(', ')}`
      )
    );
  };
}
