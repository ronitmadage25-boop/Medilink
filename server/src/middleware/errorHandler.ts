import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export const errorHandler = (
  err: Error & { code?: string | number; meta?: Record<string, unknown>; clientVersion?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message} — ${req.method} ${req.path}`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    logger.warn(`Prisma unique constraint error on ${target}`);
    res.status(409).json({
      success: false,
      message: `A record with this ${target} already exists.`,
    });
    return;
  }

  // Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    const field = err.meta?.field_name || 'relation';
    logger.warn(`Prisma foreign key error: ${field}`);
    res.status(400).json({
      success: false,
      message: 'The referenced user or record does not exist in the database.',
    });
    return;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'The requested record was not found or has been removed.',
    });
    return;
  }

  // Prisma connection / database initialization error
  if (err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError') {
    logger.error(`Prisma connection error: ${err.message}`);
    res.status(503).json({
      success: false,
      message: 'Database service is connecting or temporarily unreachable. Please retry.',
    });
    return;
  }

  // Mongoose duplicate key error (legacy)
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'An account with this field already exists.',
    });
    return;
  }

  // Unknown error — log full details but return safe response
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path });
  res.status(500).json({
    success: false,
    message:
      config.nodeEnv === 'development'
        ? err.message
        : 'An unexpected error occurred. Please try again later.',
  });
};
