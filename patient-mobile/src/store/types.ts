/**
 * Nabdah Plus - Global State Architecture Types & Conventions
 *
 * NAMING CONVENTIONS:
 * 1. Slices: Use camelCase (e.g., `userProfile`, `auth`).
 * 2. Actions:
 *    - Events: `[Domain] [Action] [Status]` (e.g., `auth/login/pending`)
 *    - Commands: `[Domain]/[Verb][Subject]` (e.g., `auth/setToken`)
 * 3. Selectors: Prefix with `select` (e.g., `selectCurrentUser`, `selectIsAuthenticated`).
 *    - Memoized Selectors must use `createSelector` from reselect.
 * 4. Async Thunks: Prefix with `fetch`, `create`, `update`, `delete` (e.g., `fetchUserProfile`).
 * 5. RTK Query Endpoints: `[verb][Subject]` (e.g., `getUser`, `updatePreferences`).
 * 6. Cache Tags: PascalCase singular (e.g., `'User'`, `'Order'`).
 */

import { Action, ThunkAction, UnknownAction } from '@reduxjs/toolkit';

/**
 * RootState will be built dynamically by ReducerManager.
 * We define it loosely here and refine it in index.ts
 */
export interface DynamicRootState {
  [key: string]: any;
}

/**
 * Common Loading State Enum
 */
export enum LoadingState {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/**
 * Generic Slice State Structure for Async Entities
 */
export interface AsyncEntityState<T, E = string> {
  data: T | null;
  loading: LoadingState;
  error: E | null;
  lastUpdated?: number;
}
