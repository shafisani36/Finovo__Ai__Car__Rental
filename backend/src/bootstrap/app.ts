import { prisma } from '../infrastructure/prisma/prisma.client';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { inquiryRouter } from '../api/routes/inquiry.routes';
import { translationRouter } from '../modules/translations/translation.routes';
import { paymentRouter } from '../api/routes/payment.routes';
import { publicSiteRouter } from '../modules/public/public-site.routes';
import { StripePaymentController } from '../modules/payments/stripe-payment.controller';
import { errorHandler } from '../middleware/error-handler';

export function createApp(): Application {
  const app = express();

  // Behind Nginx / a load balancer: needed for correct client IPs (rate limits, audit logs) and secure cookies
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // Security headers. The API serves JSON and uploaded images only; images must be loadable by the frontend origin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS: in production only the configured frontend origin(s) may call the API with cookies
  const devOrigins = [
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const allowedOrigins = new Set([...env.CORS.ORIGINS, ...(env.IS_PRODUCTION ? [] : devOrigins)]);

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // No Origin header = same-origin request, server-to-server call or health check
      if (!origin || allowedOrigins.has(origin.replace(/\/+$/, ''))) {
        callback(null, true);
      } else {
        callback(null, false);
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

  // Stripe webhook needs the untouched raw body for signature verification, so it is mounted before JSON parsing
  app.post(
    '/api/v1/payments/stripe/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    StripePaymentController.webhook
  );

  // Body parsing: large bodies only where photos/documents are uploaded as base64, 1 MB everywhere else
  const largeBody = express.json({ limit: '50mb' });
  app.use('/api/v1/vehicles', largeBody);
  app.use('/api/v1/inspections', largeBody);
  app.use('/api/v1/customers', largeBody);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // General API rate limit per IP (auth routes have their own stricter limit)
  app.use(
    '/api/v1',
    rateLimit({
      windowMs: env.RATE_LIMIT.WINDOW_MS,
      max: parseInt(process.env.RATE_LIMIT_MAX_GLOBAL || '1500', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please slow down and try again shortly.' },
      },
    })
  );

  // Uploaded images (vehicle photos, inspection photos). Never executed, never listed.
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      index: false,
      dotfiles: 'deny',
      maxAge: env.IS_PRODUCTION ? '7d' : 0,
      setHeaders: (res) => {
        // An uploaded file (even an SVG logo) is shown as a file and can never run scripts
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  // Readiness check for uptime monitors and load balancers: also confirms the database answers
  app.get('/api/health/ready', async (_req: Request, res: Response) => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'READY', database: 'UP', latencyMs: Date.now() - started });
    } catch {
      res.status(503).json({ status: 'NOT_READY', database: 'DOWN' });
    }
  });

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
  app.use('/api/v1/inquiries', inquiryRouter);
  app.use('/api/v1/translations', translationRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/public', publicSiteRouter);

  // Unknown API route: JSON 404 instead of an HTML page
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API route not found' } });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
