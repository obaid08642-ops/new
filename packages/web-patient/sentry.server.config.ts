// Sentry initialization for Patient Web App - Server Side (Next.js)
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN_PATIENT_WEB,
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: isProd ? 0.1 : 1.0,
  profilesSampleRate: isProd ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out 4xx errors
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as any).statusCode;
      if (statusCode >= 400 && statusCode < 500) {
        return null;
      }
    }
    
    return event;
  },
  
  // Ignore specific errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'socket hang up',
  ],
  
  // Debug
  debug: !isProd,
});

export { Sentry };