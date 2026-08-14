import { createMigrate } from 'redux-persist';

export const CURRENT_STATE_SCHEMA_VERSION = 1;

/**
 * Define state migrations from version N to version N+1.
 * Forward Compatibility: Redux persist handles this implicitly via migration maps.
 */
const migrations = {
  // Example migration from v0 to v1
  1: (state: any) => {
    return {
      ...state,
      // Modify state shape here
    };
  },
  // Future versions:
  // 2: (state: any) => { ... }
};

/**
 * Wraps Redux Persist createMigrate to add corruption detection and fallback mechanisms.
 */
export const storeVersionManager = async (state: any, currentVersion: number) => {
  try {
    const migrator = createMigrate(migrations, { debug: __DEV__ });
    return await migrator(state, currentVersion);
  } catch (error) {
    console.error('[StoreVersionManager] Migration failed, executing rollback', error);
    // Rollback: return undefined to completely wipe corrupted state and start fresh.
    return undefined;
  }
};

/**
 * Action to reset the store safely if corruption is detected
 */
export const resetStoreAction = { type: 'STORE/RESET_ALL' };
