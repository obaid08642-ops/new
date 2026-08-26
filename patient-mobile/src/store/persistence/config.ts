import { secureStorageAdapter } from './SecureStorageAdapter';
import { storeVersionManager, CURRENT_STATE_SCHEMA_VERSION } from './StoreVersionManager';

export const persistConfig = {
  key: 'nabdah_plus_root',
  version: CURRENT_STATE_SCHEMA_VERSION,
  storage: secureStorageAdapter,
  migrate: storeVersionManager,
  
  // Explicitly persist only these slices
  whitelist: [
    'theme',
    'localization',
    'device',
    'settings',
    'cart',
    'app_config'
  ],
  
  // Explicitly do NOT persist these slices
  // auth: Tokens are handled by SessionManager via SecureStore independently
  blacklist: [
    'auth',
    'session',
    'connectivity',
    'search'
  ],
};
