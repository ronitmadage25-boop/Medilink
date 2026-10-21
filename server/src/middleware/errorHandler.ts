import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export const errorHandler = (
  err: Error,
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

  // Mongoose duplicate key error
  if ((err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : 'field';
    logger.warn(`Duplicate key error: ${field}`);
    res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const valErr = err as unknown as { errors?: Record<string, { message: string }> };
    const messages = valErr.errors
      ? Object.values(valErr.errors).map((e) => e.message)
      : ['Validation failed'];
    res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: messages,
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource identifier.',
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
