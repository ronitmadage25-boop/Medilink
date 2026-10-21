import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import argon2 from 'argon2';
import { config } from '../config/env';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const seedAdmin = async () => {
  if (!config.adminBootstrapEmail || !config.adminBootstrapPassword) {
    logger.error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in .env');
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);
  logger.info('Connected to MongoDB for admin seed');

  const existing = await User.findOne({ email: config.adminBootstrapEmail });
  if (existing) {
    if (existing.role === 'ADMIN') {
      logger.info(`Admin already exists: ${existing.email}`);
    } else {
      logger.error(`A non-admin account already exists with email: ${existing.email}`);
    }
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await argon2.hash(config.adminBootstrapPassword);
  const admin = await User.create({
    email: config.adminBootstrapEmail,
    password: hashedPassword,
    name: 'Platform Administrator',
    mobile: '0000000000',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });

  logger.info(`Admin account created: ${admin.email}`);
  logger.info('IMPORTANT: Remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from .env after first run.');

  await mongoose.disconnect();
};

seedAdmin().catch((err) => {
  logger.error('Admin seed failed:', err);
  process.exit(1);
});
