import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import argon2 from 'argon2';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const seedAdmin = async () => {
  if (!config.adminBootstrapEmail || !config.adminBootstrapPassword) {
    logger.error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: config.adminBootstrapEmail } });
  if (existing) {
    if (existing.role === 'ADMIN') {
      logger.info(`Admin already exists: ${existing.email}`);
    } else {
      logger.error(`A non-admin account already exists with email: ${existing.email}`);
    }
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await argon2.hash(config.adminBootstrapPassword);
  const admin = await prisma.user.create({
    data: {
      email: config.adminBootstrapEmail,
      password: hashedPassword,
      name: 'Platform Administrator',
      mobile: '0000000000',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  logger.info(`Admin account created: ${admin.email}`);
  await prisma.$disconnect();
};

seedAdmin().catch((err) => {
  logger.error('Admin seed failed:', err);
  process.exit(1);
});

