import { configureStore, UnknownAction } from '@reduxjs/toolkit';
import {
  setupListeners
} from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import { createReducerManager } from './ReducerManager';
import { persistConfig } from './persistence/config';
import { listenerMiddleware } from './middleware/listenerMiddleware';
import { memoryManagerMiddleware } from './middleware/memoryManager';
import { backgroundUpdaterMiddleware } from './middleware/backgroundUpdater';
import { FeatureRegistry } from './FeatureRegistry';
import { baseApi } from './api/baseApi';
import { integrateEventBusWithRedux } from './integration/EventBusIntegrator';
import { container } from '../core/di/Container';
import { EventBus } from '../core/events/EventBus';

// Initial statically imported core slices
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import cartReducer from './slices/cartSlice';
import appointmentsReducer from './slices/appointmentsSlice';
import notificationsReducer from './slices/notificationsSlice';

import { resetStoreAction } from './actions/recovery';
import { observabilityMiddleware } from './middleware/observability';

// 1. Define initial reducers
const initialReducers = {
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
  theme: themeReducer,
  cart: cartReducer,
  appointments: appointmentsReducer,
  notifications: notificationsReducer,
};

// 2. Create the ReducerManager
const reducerManager = createReducerManager(initialReducers);

// 3. Link ReducerManager to FeatureRegistry for dynamic injection
FeatureRegistry.setReducerManager(reducerManager);

// 4. Wrap the root reducer with Redux Persist and Recovery Logic
const rootReducer = (state: any, action: UnknownAction) => {
  if (action.type === resetStoreAction.type) {
    // Keep device/theme settings if needed, or nuke everything.
    // For complete reset:
    state = undefined;
    // Explicitly clear RTK Query cache memory
    store?.dispatch(baseApi.util.resetApiState());
    // Explicitly purge the physical storage
    persistor?.purge();
  }
  return reducerManager.reduce(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// 5. Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions from serialization checks
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      immutableCheck: true, // Warns if state is mutated directly
    })
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware)
      .concat(memoryManagerMiddleware)
      .concat(backgroundUpdaterMiddleware)
      .concat(observabilityMiddleware)
      .concat(FeatureRegistry.getDynamicMiddlewares());
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// 6. Setup Persistor
export const persistor = persistStore(store);

// 6.5 Integrate Domain EventBus with Redux
try {
  const eventBus = container.resolve<EventBus>('EventBus');
  integrateEventBusWithRedux(store, eventBus);
} catch (e) {
  console.warn('Could not resolve EventBus for Redux integration', e);
}

// 7. Enable automatic refetching for RTK Query on focus/reconnect
setupListeners(store.dispatch);

// 8. Extract standard types
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Type-safe hooks are expected to be imported from a separate hooks file 
// to avoid circular dependencies, but can be defined here if safe.
