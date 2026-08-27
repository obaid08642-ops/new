import { Action, Dispatch } from '@reduxjs/toolkit';

/**
 * RTK Query helper to wrap mutations with offline queue support.
 * If the device is offline, instead of failing, the action is queued.
 * 
 * Note: Actual offline queue execution is handled by `HttpClient.ts` (enqueueOfflineRequest).
 * This helper is for dispatching specific Redux actions when offline mutations happen.
 */
export const withOfflineSupport = async <T>(
  mutation: () => Promise<T>,
  dispatch: Dispatch,
  fallbackAction?: Action
): Promise<T | void> => {
  try {
    return await mutation();
  } catch (error: any) {
    // If it's a network error (no connection)
    if (error?.message === 'Network request failed' || error?.status === 0) {
      if (fallbackAction) {
        dispatch(fallbackAction);
      }
      // Can also dispatch a generic 'offline/queued' action to show a toast
    } else {
      throw error;
    }
  }
};
