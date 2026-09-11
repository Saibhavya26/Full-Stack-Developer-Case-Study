import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          message: `A record with this ${(err.meta?.target as string[])?.join(', ') ?? 'value'} already exists`,
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: { message: 'Requested record was not found' },
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: { message: 'Referenced record does not exist (foreign key constraint failed)' },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  return res.status(500).json({
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : (err as Error)?.message ?? 'Internal server error',
    },
  });
}
