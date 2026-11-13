/**
 * Browser error monitoring (Sentry). Loaded only when VITE_SENTRY_DSN is set,
 * so the Sentry code is a separate chunk that local development never downloads.
 */
type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;
const pending: Array<{ error: unknown; context?: Record<string, unknown> }> = [];

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  void import('@sentry/react').then((module) => {
    module.init({
      dsn,
      environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE,
      sendDefaultPii: false,
      // Network and console noise from browser extensions is not our error
      ignoreErrors: ['ResizeObserver loop limit exceeded', 'ResizeObserver loop completed with undelivered notifications'],
    });
    sentry = module;
    pending.splice(0).forEach(({ error, context }) => reportError(error, context));
  });

  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, { source: 'unhandledrejection' }));
}

/** Reports an error caught by the app (for example by an error boundary). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (!sentry) {
    pending.push({ error, context });
    return;
  }
  sentry.withScope((scope) => {
    if (context) scope.setContext('details', context);
    sentry!.captureException(error);
  });
}
