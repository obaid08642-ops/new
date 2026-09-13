import * as Sentry from '@sentry/react-native';

/**
 * Provider-app error monitoring (Sentry project: provider-app).
 * DSN via env: EXPO_PUBLIC_SENTRY_DSN. Empty = disabled (dev-safe).
 * Mirrors patient-app wiring; skips Expo Go like patient-app.
 */
let ready = false;

export function initProviderSentry() {
  if (ready) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  if (!dsn) {
    if (__DEV__) console.warn('[Sentry] DSN not configured, error monitoring is disabled.');
    return;
  }
  try {
    const Constants = require('expo-constants').default;
    const { ExecutionEnvironment } = require('expo-constants');
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  } catch { /* non-expo runtime: continue */ }
  try {
    Sentry.init({
      dsn,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    });
    ready = true;
    if (__DEV__) console.log('[Sentry] provider-app initialized');
  } catch (e: any) {
    console.warn('[Sentry] provider init failed:', e?.message);
  }
}
