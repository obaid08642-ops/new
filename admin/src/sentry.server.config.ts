/**
 * 15.5 — Sentry for the admin Node server (the BFF API routes).
 *
 * Source maps are uploaded by `withSentryConfig` in `next.config.ts`; this file
 * only attaches the release and environment to server-side events.
 */
import * as Sentry from '@sentry/nextjs';
import { resolveEnvironment, resolveRelease } from './lib/observability/error-reporter';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

Sentry.init({
  dsn,
  release: resolveRelease(),
  environment: resolveEnvironment(),
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
});

export {};
