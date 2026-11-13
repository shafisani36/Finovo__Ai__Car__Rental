import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

/** Development-only fallbacks. In production the real secrets are required (see validateEnv). */
const DEV_ACCESS_SECRET = 'finovo_jwt_access_secret_super_secure_key_2026';
const DEV_REFRESH_SECRET = 'finovo_jwt_refresh_secret_super_secure_key_2026';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: isProduction,
  PORT: parseInt(process.env.PORT || '5000', 10),
  /** The one currency used for every price, booking, invoice and Stripe charge (ISO 4217 code). */
  CURRENCY: (process.env.APP_CURRENCY || 'SAR').trim().toUpperCase(),
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/finovo_car_rental',
  
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET,
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  COOKIE: {
    SESSION_NAME: process.env.SESSION_COOKIE_NAME || 'finovo_session',
    REFRESH_NAME: process.env.REFRESH_COOKIE_NAME || 'finovo_refresh_token',
    // Empty = host-only cookie, which is correct for most deployments (a fixed 'localhost' breaks live domains)
    DOMAIN: process.env.COOKIE_DOMAIN || undefined,
    SECURE: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
    SAME_SITE: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  },

  CORS: {
    /** First allowed origin; also used to build links in emails. */
    ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5176').split(',')[0].trim(),
    /** Every allowed browser origin (comma-separated CORS_ORIGIN). */
    ORIGINS: (process.env.CORS_ORIGIN || 'http://localhost:5176')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  },

  /** Number of reverse proxies in front of the API (Nginx, a load balancer): needed for correct client IPs. */
  TRUST_PROXY: parseInt(process.env.TRUST_PROXY || (isProduction ? '1' : '0'), 10),

  ARGON2: {
    MEMORY_COST: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
    TIME_COST: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
    PARALLELISM: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),
  },

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    MAX_AUTH: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '20', 10),
    MAX_API: parseInt(process.env.RATE_LIMIT_MAX_API || '120', 10),
  },

  EMAIL: {
    /** 'smtp' sends real email; 'mock' only prints to the console (development). */
    PROVIDER: process.env.EMAIL_PROVIDER || 'mock',
    FROM: process.env.EMAIL_FROM || 'Finovo AI Car Rental <noreply@finovo-rental.com>',
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
  },

  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  VISION: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
  },
};

/**
 * Fails fast on a production start with missing or insecure configuration, instead of running a site
 * that leaks sessions or silently drops password-reset emails.
 */
export function validateEnv(): void {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL is not set');

  if (env.IS_PRODUCTION) {
    for (const [name, value, devDefault] of [
      ['JWT_ACCESS_SECRET', env.JWT.ACCESS_SECRET, DEV_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', env.JWT.REFRESH_SECRET, DEV_REFRESH_SECRET],
    ] as const) {
      if (value === devDefault || value.length < 32) problems.push(`${name} must be a random secret of at least 32 characters`);
    }
    if (env.JWT.ACCESS_SECRET === env.JWT.REFRESH_SECRET) problems.push('JWT access and refresh secrets must differ');
    if (!process.env.CORS_ORIGIN) problems.push('CORS_ORIGIN must list the live frontend URL(s)');
    if (env.CORS.ORIGINS.some((o) => o.includes('localhost'))) warnings.push('CORS_ORIGIN contains localhost');
    if (!env.COOKIE.SECURE) warnings.push('COOKIE_SECURE is false: auth cookies will be sent over plain HTTP');
    if (env.EMAIL.PROVIDER !== 'smtp') {
      warnings.push('EMAIL_PROVIDER is not smtp: verification and password-reset emails will NOT be delivered');
    }
    if (!env.STRIPE.SECRET_KEY) warnings.push('STRIPE_SECRET_KEY is not set: online payments are disabled');
    if (env.STRIPE.SECRET_KEY.startsWith('sk_test_')) warnings.push('Stripe is in TEST mode (sk_test_ key)');
    if (!env.VISION.GEMINI_API_KEY && !env.VISION.OPENAI_API_KEY) warnings.push('No AI vision key: inspections are disabled');
  }

  if (env.EMAIL.PROVIDER === 'smtp' && (!env.EMAIL.SMTP_HOST || !env.EMAIL.SMTP_USER || !env.EMAIL.SMTP_PASS)) {
    problems.push('EMAIL_PROVIDER=smtp requires SMTP_HOST, SMTP_USER and SMTP_PASS');
  }

  for (const w of warnings) console.warn(`[config] WARNING: ${w}`);
  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`);
  }
}
