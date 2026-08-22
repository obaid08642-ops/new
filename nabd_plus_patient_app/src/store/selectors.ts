import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

/**
 * Example of Selector Composition using reselect.
 * Memoizes results to prevent unnecessary React re-renders.
 */

// Basic State Selectors
export const selectThemeState = (state: RootState) => state.theme;
export const selectAuthState = (state: RootState) => state.auth;

// Memoized Composed Selectors
export const selectIsDarkMode = createSelector(
  [selectThemeState],
  (theme) => theme?.mode === 'dark'
);

export const selectIsUserAuthenticated = createSelector(
  [selectAuthState],
  (auth) => !!auth?.isAuthenticated
);

// Advanced Memoized Selector (combining multiple slices)
// Evaluates only when theme or auth changes
export const selectPersonalizedTheme = createSelector(
  [selectThemeState, selectAuthState],
  (theme, auth) => {
    if (auth?.isAuthenticated && auth.user?.preferences?.theme) {
      return auth.user.preferences.theme;
    }
    return theme?.mode || 'light';
  }
);
