// Sentry initialization for Edge Middleware (Next.js)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN_PATIENT_WEB,
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  
  release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version,
  
  beforeSend(event) {
    // Filter out 4xx errors
    const error = event.exception?.values?.[0];
    if (error && 'statusCode' in error.mechanism?.meta || {}) {
      const statusCode = error.mechanism?.meta?.statusCode;
      if (statusCode >= 400 && statusCode < 500) {
        return null;
      }
    }
    return event;
  },
});

export { Sentry };