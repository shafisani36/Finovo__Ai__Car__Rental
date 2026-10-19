import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/finovo_car_rental',
  
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'finovo_jwt_access_secret_super_secure_key_2026',
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'finovo_jwt_refresh_secret_super_secure_key_2026',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  COOKIE: {
    SESSION_NAME: process.env.SESSION_COOKIE_NAME || 'finovo_session',
    REFRESH_NAME: process.env.REFRESH_COOKIE_NAME || 'finovo_refresh_token',
    DOMAIN: process.env.COOKIE_DOMAIN || 'localhost',
    SECURE: process.env.COOKIE_SECURE === 'true',
    SAME_SITE: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  },

  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5176',
  },

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
    PROVIDER: process.env.EMAIL_PROVIDER || 'mock',
    FROM: process.env.EMAIL_FROM || 'Finovo AI Car Rental <noreply@finovo-rental.com>',
  },
};
