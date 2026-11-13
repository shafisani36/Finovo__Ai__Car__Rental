import * as Sentry from '@sentry/node';

/**
 * Error monitoring (Sentry). Turned on only when SENTRY_DSN is set, so local
 * development and tests send nothing. Personal data is never attached.
 */
let enabled = false;

export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip request bodies, cookies and auth headers: they can hold passwords, tokens and documents
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
  enabled = true;
  console.log(' Error monitoring enabled (Sentry)');
}

/** Reports an unexpected error with optional context such as the route. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext('request', context);
    Sentry.captureException(err);
  });
}

/** Sends any queued reports before the process exits. */
export async function flushMonitoring(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  await Sentry.flush(timeoutMs);
}
