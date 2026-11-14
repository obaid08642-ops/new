import { Platform } from 'react-native';

let Sentry: any = null;
const getSentry = () => {
  if (!Sentry && Platform.OS !== 'web') {
    try {
      const Constants = require('expo-constants').default;
      const { ExecutionEnvironment } = require('expo-constants');
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      if (!isExpoGo) {
        Sentry = require('@sentry/react-native');
      }
    } catch (e) {
      console.warn('[Sentry] Failed to load Sentry native module:', e);
    }
  }
  return Sentry;
};

export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error monitoring is disabled.');
    return;
  }
  const sentryInstance = getSentry();
  if (!sentryInstance) return;

  try {
    sentryInstance.init({
      dsn,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      // R18: 10 % in production (app start, screen load and slow-frame data without paying for every session), everything in development
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    });
    console.log('[Sentry] Initialized successfully');
  } catch (e: any) {
    console.warn('[Sentry] Init failed:', e.message);
  }
};

export const setSentryUser = (user: { id: string; email?: string; name?: string } | null) => {
  const sentryInstance = getSentry();
  if (!sentryInstance) return;

  try {
    if (user) {
      sentryInstance.setUser({
        id: user.id,
        email: user.email || '',
        username: user.name || user.id,
      });
    } else {
      sentryInstance.setUser(null);
    }
  } catch {}
};
