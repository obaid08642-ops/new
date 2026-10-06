import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  // Backend project DSN via SENTRY_DSN (server env). Empty = disabled (dev-safe).
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV || 'development',
  integrations: [nodeProfilingIntegration()],
  // Production: 10% traces + 10% profiles (cost/noise control).
  // Dev/test: full fidelity.
  tracesSampleRate: isProd ? 0.1 : 1.0,
  profileSessionSampleRate: isProd ? 0.1 : 1.0,
  profileLifecycle: 'trace',
  // 4xx (validation/auth) never reach Sentry: SentryExceptionFilter
  // captures 500+ only. No SentryGlobalFilter on purpose.
});
