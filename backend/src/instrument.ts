import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { scrubDeep } from './common/secret-scrub';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  // Backend project DSN via SENTRY_DSN (server env). Empty = disabled (dev-safe).
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  // P20.4: every event names the deployed commit (build arg SENTRY_RELEASE = the release SHA, Dockerfile.backend).
  // Stacks point at src/*.ts: the image runs node --enable-source-maps over dist/*.js.map.
  release: process.env.SENTRY_RELEASE || undefined,
  integrations: [nodeProfilingIntegration()],
  // Production: 10% traces + 10% profiles (cost/noise control).
  // Dev/test: full fidelity.
  tracesSampleRate: isProd ? 0.1 : 1.0,
  profileSessionSampleRate: isProd ? 0.1 : 1.0,
  profileLifecycle: 'trace',
  // Anything that looks like a key or token is masked in the event before it leaves the process.
  beforeSend: (event) => scrubDeep(event),
  // 4xx (validation/auth) never reach Sentry: SentryExceptionFilter
  // captures 500+ only. No SentryGlobalFilter on purpose.
});
