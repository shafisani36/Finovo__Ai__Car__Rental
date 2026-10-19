import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from '../config/env.config';
import { authRouter } from '../api/routes/auth.routes';
import { sessionRouter } from '../api/routes/session.routes';
import { adminRouter } from '../api/routes/admin.routes';
import { vehicleRouter } from '../api/routes/vehicle.routes';
import { dashboardRouter } from '../api/routes/dashboard.routes';
import { bookingRouter } from '../api/routes/booking.routes';
import { rentalRouter } from '../api/routes/rental.routes';
import { inspectionRouter } from '../api/routes/inspection.routes';
import { customerRouter } from '../api/routes/customer.routes';
import { branchRouter } from '../api/routes/branch.routes';
import { errorHandler } from '../middleware/error-handler';

export function createApp(): Application {
  const app = express();

  // CORS Configuration supporting frontend cookies, authentication, and tracing headers
  const allowedOrigins = [
    env.CORS.ORIGIN,
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-Id',
      'x-correlation-id',
      'X-Request-Id',
      'x-request-id',
      'X-Idempotency-Key',
      'x-idempotency-key',
      'Accept',
      'Origin',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: [
      'X-Correlation-Id',
      'x-correlation-id',
      'X-Request-Id',
      'x-request-id',
      'Set-Cookie',
    ],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body and cookie parsing with expanded limit for fleet high-res photo uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Static assets serving for vehicle uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'finovo-auth-service',
      environment: env.NODE_ENV,
    });
  });

  // Mount API modules
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/sessions', sessionRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/vehicles', vehicleRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/bookings', bookingRouter);
  app.use('/api/v1/rentals', rentalRouter);
  app.use('/api/v1/inspections', inspectionRouter);
  app.use('/api/v1/customers', customerRouter);
  app.use('/api/v1/branches', branchRouter);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
