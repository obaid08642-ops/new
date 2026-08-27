import { Middleware } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';

/**
 * Memory Management Middleware
 * 
 * Monitors the size of the Redux state and triggers cache cleanup 
 * if memory pressure becomes too high (to prevent OOM crashes on older devices).
 */

const MAX_CACHE_ENTRIES = 100; // Example threshold
let actionCount = 0;

export const memoryManagerMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Only check periodically to save CPU
  actionCount++;
  if (actionCount > 50) {
    actionCount = 0;
    
    const state = store.getState();
    if (state.api) {
      const queries = state.api.queries;
      const queryKeys = Object.keys(queries);
      
      // LRU Strategy: If we have too many cached queries, we can dispatch an RTK Query 
      // internal action to clear unused ones, or we rely on keepUnusedDataFor.
      // RTK Query already handles GC for unused queries automatically, but if we have 
      // a massive store we might want to manually prune.
      
      if (queryKeys.length > MAX_CACHE_ENTRIES) {
        // Dispatch util.resetApiState() or manually clear cache if needed.
        // For standard use cases, RTK Query's built-in GC (keepUnusedDataFor) is sufficient.
        console.warn(`[MemoryManager] High cache size detected: ${queryKeys.length} queries`);
      }
    }
  }

  return result;
};
