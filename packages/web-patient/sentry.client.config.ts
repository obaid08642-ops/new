// Sentry initialization for Patient Web App (Next.js)
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN_PATIENT_WEB,
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: isProd ? 0.1 : 1.0,
  profilesSampleRate: isProd ? 0.1 : 1.0,
  
  // Session replay for debugging
  replaysOnErrorSampleRate: isProd ? 0.1 : 1.0,
  replaysSessionSampleRate: isProd ? 0.01 : 0.1,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out 4xx errors (handled by backend)
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      if (status >= 400 && status < 500) {
        return null;
      }
    }
    
    // Remove PII from user data
    if (event.user) {
      event.user = {
        id: event.user.id,
        email: event.user.email ? 'REDACTED' : undefined,
        username: event.user.username ? 'REDACTED' : undefined,
      };
    }
    
    return event;
  },
  
  // Ignore specific errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'ChunkLoadError',
    'Loading chunk',
  ],
  
  // Performance settings
  enableTracing: true,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/api\.nabd\.plus/,
  ],
  
  // Debug
  debug: !isProd,
});

// Export Sentry for use in components
export { Sentry };

// Helper functions
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}