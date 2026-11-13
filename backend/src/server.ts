import { initMonitoring, captureError, flushMonitoring } from './infrastructure/monitoring/monitoring';
import { createApp } from './bootstrap/app';
import { env, validateEnv } from './config/env.config';
import { prisma } from './infrastructure/prisma/prisma.client';
import { normalizeStoredCurrency } from './infrastructure/prisma/currency-normalizer';

async function bootstrap() {
  validateEnv();
  initMonitoring();
  const app = createApp();

  // Test database connection
  try {
    await prisma.$connect();
    console.log(' Successfully connected to the MySQL database');
  } catch (err) {
    console.error(' Database connection failed on startup:', err);
    process.exit(1);
  }

  // Keep every stored record in the single app currency (no-op once everything matches)
  try {
    await normalizeStoredCurrency();
  } catch (err) {
    console.error(' Currency normalization failed:', err);
    captureError(err);
  }

  const server = app.listen(env.PORT, () => {
    console.log(` Finovo API listening on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(` Health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await flushMonitoring();
      await prisma.$disconnect();
      console.log(' Server and database connections closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Log instead of silently losing async failures; a crashing process is restarted by the process manager
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    captureError(reason, { source: 'unhandledRejection' });
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    captureError(err, { source: 'uncaughtException' });
    shutdown('uncaughtException');
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
