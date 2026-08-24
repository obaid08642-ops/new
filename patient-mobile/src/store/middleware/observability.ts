import { Middleware } from '@reduxjs/toolkit';
import { analytics } from '../../services/Analytics';

/**
 * Observability Middleware
 *
 * Provides an abstract, provider-independent way to monitor state health,
 * action frequencies, cache sizes, and hydration times.
 */

let initializationTime = Date.now();
let isHydrated = false;

export const observabilityMiddleware: Middleware = (store) => (next) => (action: any) => {
  const startTime = performance.now();

  // Track Hydration Time
  if (action.type === 'persist/REHYDRATE' && !isHydrated) {
    isHydrated = true;
    const hydrationDuration = Date.now() - initializationTime;

    analytics.track('store_hydrated', {
      duration_ms: hydrationDuration,
      payload_size: JSON.stringify(action.payload || {}).length
    });
  }

  // Track specific critical errors
  if (action.type.endsWith('/rejected')) {
    analytics.track('store_action_rejected', {
      action_type: action.type,
      error_message: action.error?.message,
    });
  }

  const result = next(action);

  // Performance Counters (log slow reducers)
  const duration = performance.now() - startTime;
  if (duration > 16) { // 16ms = 1 frame drop
    // In production, we'd sample this to avoid spamming analytics
    if (__DEV__) {
      console.warn(`[Observability] Slow reducer for ${action.type}: ${duration.toFixed(2)}ms`);
    }
  }

  return result;
};
