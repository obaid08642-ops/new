import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Offline Sync State Tracking
 * Used to track the status of offline pending operations and sync conflicts.
 */
interface SyncState {
  isSyncing: boolean;
  pendingOperationsCount: number;
  lastSyncTime: number | null;
  conflicts: any[]; // Defined specifically in Phase 1C-C
}

const initialState: SyncState = {
  isSyncing: false,
  pendingOperationsCount: 0,
  lastSyncTime: null,
  conflicts: [],
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    syncStarted: (state) => {
      state.isSyncing = true;
    },
    syncCompleted: (state) => {
      state.isSyncing = false;
      state.lastSyncTime = Date.now();
      state.pendingOperationsCount = 0;
    },
    syncFailed: (state) => {
      state.isSyncing = false;
    },
    operationQueued: (state) => {
      state.pendingOperationsCount += 1;
    },
    conflictDetected: (state, action: PayloadAction<any>) => {
      state.conflicts.push(action.payload);
    },
    reset: () => initialState,
  },
});

export const {
  syncStarted,
  syncCompleted,
  syncFailed,
  operationQueued,
  conflictDetected,
  reset,
} = syncSlice.actions;

export default syncSlice.reducer;
