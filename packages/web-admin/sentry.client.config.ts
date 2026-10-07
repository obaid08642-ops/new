// Sentry initialization for Admin Web App (Next.js)
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN_ADMIN_WEB,
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: isProd ? 0.1 : 1.0,
  profilesSampleRate: isProd ? 0.1 : 1.0,
  
  replaysOnErrorSampleRate: isProd ? 0.1 : 1.0,
  replaysSessionSampleRate: isProd ? 0.01 : 0.1,
  
  release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      if (status >= 400 && status < 500) {
        return null;
      }
    }
    
    if (event.user) {
      event.user = {
        id: event.user.id,
        email: event.user.email ? 'REDACTED' : undefined,
        username: event.user.username ? 'REDACTED' : undefined,
      };
    }
    
    return event;
  },
  
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'ChunkLoadError',
    'Loading chunk',
  ],
  
  enableTracing: true,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/api\.nabd\.plus/,
  ],
  
  debug: !isProd,
});

export { Sentry };

export function setUserContext(user: { id: string; email?: string; role?: string; permissions?: string[] }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}