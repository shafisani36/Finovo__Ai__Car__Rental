import rateLimit from 'express-rate-limit';
import { env } from '../config/env.config';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT.MAX_AUTH, // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS,
  max: env.RATE_LIMIT.MAX_API,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'API rate limit exceeded. Please try again later.',
    },
  },
});
