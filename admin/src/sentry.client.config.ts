/**
 * 15.5 — Sentry for the admin browser bundle.
 *
 * Loaded from `_app.tsx` on the client only. The DSN is an owner secret read
 * from the environment: empty means reporting is disabled (development-safe),
 * exactly as in `patient-web/sentry.client.config.ts` and
 * `backend/src/instrument.ts`. The release is injected here so every event this
 * bundle sends is filed against the build the operator is actually running.
 */
import * as Sentry from '@sentry/nextjs';
import { resolveEnvironment, resolveRelease } from './lib/observability/error-reporter';

const release = resolveRelease();
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

Sentry.init({
  dsn,
  release,
  environment: resolveEnvironment(),
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
});

if (!dsn) {
  // eslint-disable-next-line no-console
  console.info(`[sentry] disabled (no NEXT_PUBLIC_SENTRY_DSN) for release ${release}`);
}

export {};
