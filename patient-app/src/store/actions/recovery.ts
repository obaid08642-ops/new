import { createAction } from '@reduxjs/toolkit';

/**
 * Global Recovery Actions
 * Used to reset the entire store, or specific domains without coupling to the slices directly.
 */

// Resets all state to initial values, except for whitelisted persistent non-user configs.
// Commonly dispatched on logout, or if corruption is detected.
export const resetStoreAction = createAction('STORE/RESET_ALL');

// Resets only user-specific data (keeps device settings, localization intact)
export const resetUserSessionAction = createAction('STORE/RESET_USER_SESSION');
