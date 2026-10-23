import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasourceUrl: config.databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export const connectPostgres = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL (Neon DB) successfully via Prisma ORM.');
  } catch (error) {
    logger.warn('Initial PostgreSQL connection attempt had error (will retry automatically on query):', error);
  }
};

