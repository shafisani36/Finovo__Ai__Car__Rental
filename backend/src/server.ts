import { createApp } from './bootstrap/app';
import { env } from './config/env.config';
import { prisma } from './infrastructure/prisma/prisma.client';

async function bootstrap() {
  const app = createApp();

  // Test database connection
  try {
    await prisma.$connect();
    console.log(' Successfully connected to MySQL database: finovo_car_rental');
  } catch (err) {
    console.error(' Database connection failed on startup:', err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(` Finovo Auth API server listening on http://localhost:${env.PORT}`);
    console.log(` Health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log(' Server and database connections closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
