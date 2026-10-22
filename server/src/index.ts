import express from 'express';
import 'express-async-errors';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/env';
import { connectPostgres } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';
import { webrtcService } from './services/webrtcService';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import patientRoutes from './routes/patients';
import doctorRoutes from './routes/doctors';
import diagnosticCentreRoutes from './routes/diagnosticCentres';
import recordRoutes from './routes/records';
import reportRoutes from './routes/reports';
import prescriptionRoutes from './routes/prescriptions';
import appointmentRoutes from './routes/appointments';
import notificationRoutes from './routes/notifications';
import checkInRoutes from './routes/checkIns';
import callScheduleRoutes from './routes/callSchedules';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import auditRoutes from './routes/auditLogs';

const app = express();
const server = http.createServer(app);

// Initialize WebRTC Real-Time Signaling Engine
webrtcService.init(server, config.clientUrl);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);
    if (
      requestOrigin === config.clientUrl ||
      requestOrigin === 'http://localhost:5173' ||
      requestOrigin === 'http://127.0.0.1:5173' ||
      requestOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: 'Neon PostgreSQL (Connected)',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API routes
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/diagnostic-centres`, diagnosticCentreRoutes);
app.use(`${API_PREFIX}/records`, recordRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/prescriptions`, prescriptionRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/check-ins`, checkInRoutes);
app.use(`${API_PREFIX}/call-schedules`, callScheduleRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/audit-logs`, auditRoutes);

// Local uploads fallback
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    await connectPostgres();
    server.listen(config.port, () => {
      logger.info(`MediLink+ API & WebRTC Engine active on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;
