import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(process.cwd(), 'server/.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_Xm1zKqCF5nQD@ep-long-king-b5ylg1c0-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue = ''): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '5000'), 10),
  databaseUrl: requireEnv('DATABASE_URL', DEFAULT_DATABASE_URL),
  clientUrl: optionalEnv('CLIENT_URL', 'http://localhost:5173'),
  serverUrl: optionalEnv('SERVER_URL', 'http://localhost:5000'),

  // JWT
  jwtSecret: requireEnv('JWT_SECRET', 'medilink-super-secure-production-ready-jwt-secret-key-32chars'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET', 'medilink-super-secure-production-ready-refresh-secret-key-32chars'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '4h'),
  jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Password reset
  passwordResetSecret: requireEnv('PASSWORD_RESET_SECRET', 'medilink-password-reset-key-secret'),

  // File storage
  fileStorageProvider: optionalEnv('FILE_STORAGE_PROVIDER', 'local') as 'local' | 'cloudinary',
  localUploadDir: optionalEnv('LOCAL_UPLOAD_DIR', 'uploads'),
  cloudinaryCloudName: optionalEnv('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: optionalEnv('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: optionalEnv('CLOUDINARY_API_SECRET'),

  // AI
  aiProvider: (optionalEnv('AI_PROVIDER') || (process.env.OPENAI || process.env.OPENAI_API_KEY || process.env.AI_API_KEY ? 'openai' : 'none')) as 'openai' | 'none',
  aiApiKey: optionalEnv('AI_API_KEY') || optionalEnv('OPENAI_API_KEY') || optionalEnv('OPENAI'),
  aiModel: optionalEnv('AI_MODEL', 'gpt-4o'),

  // Telephony
  telephonyProvider: optionalEnv('TELEPHONY_PROVIDER', 'none') as 'twilio' | 'none',
  twilioAccountSid: optionalEnv('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: optionalEnv('TWILIO_AUTH_TOKEN'),
  twilioPhoneNumber: optionalEnv('TWILIO_PHONE_NUMBER'),
  twilioWebhookSecret: optionalEnv('TWILIO_WEBHOOK_SECRET'),

  // Email
  emailProvider: optionalEnv('EMAIL_PROVIDER', 'none') as 'smtp' | 'none',
  smtpHost: optionalEnv('SMTP_HOST'),
  smtpPort: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
  smtpUser: optionalEnv('SMTP_USER'),
  smtpPass: optionalEnv('SMTP_PASS'),
  emailFrom: optionalEnv('EMAIL_FROM', 'noreply@medilink.health'),

  // Rate limiting
  rateLimitWindowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMax: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  authRateLimitMax: parseInt(optionalEnv('AUTH_RATE_LIMIT_MAX', '10'), 10),

  // Admin bootstrap
  adminBootstrapEmail: optionalEnv('ADMIN_BOOTSTRAP_EMAIL', 'admin@medilink.health'),
  adminBootstrapPassword: optionalEnv('ADMIN_BOOTSTRAP_PASSWORD'),
};

export type Config = typeof config;
