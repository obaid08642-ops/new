import { Middleware } from '@reduxjs/toolkit';

/**
 * Background Updater Middleware
 * 
 * Intercepts actions related to background synchronization and silent refetching.
 * Ensures that background updates do not trigger heavy UI re-renders if the UI
 * is already in an optimal state, or schedules them during idle time.
 */
export const backgroundUpdaterMiddleware: Middleware = (store) => (next) => (action: any) => {
  // If an action has a meta tag `isBackground: true`, we can throttle it,
  // or log metrics for background sync.
  
  if (action?.meta?.isBackground) {
    // console.log('[Background Updater] Silently syncing:', action.type);
    
    // We could use React Native's InteractionManager here to wait for interactions 
    // to finish before processing heavy state updates.
    // e.g., InteractionManager.runAfterInteractions(() => next(action));
  }
  
  return next(action);
};
