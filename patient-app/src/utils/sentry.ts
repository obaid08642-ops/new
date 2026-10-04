/**
 * 15.5 — kept as the historical import path. The implementation now lives in
 * `src/services/monitoring/crash`, which adds the RELEASE (the thing that was
 * missing) and a no-op-safe init. This file only forwards.
 */
export {
  initCrashReporting as initSentry,
  setCrashUser as setSentryUser,
  getCrashState,
  getRelease,
  captureException,
  captureMessage,
  addBreadcrumb,
} from '../services/monitoring/crash';
