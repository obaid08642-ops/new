# Nabdah Plus - Store Architecture (Phase 1C-B)

## Overview
The state management architecture for Nabdah Plus is built using **Redux Toolkit (RTK)** and **RTK Query**.
It strictly adheres to performance, modularity, and offline-first principles.

## Core Principles
1. **Dynamic Module Injection**: We do NOT statically import all reducers in `store/index.ts`. Instead, we use `ReducerManager` and `FeatureRegistry`. This allows future modules (Pharmacy, Doctors, Labs) to register their own Reducers, Middlewares, and RTK Query Endpoints at runtime, reducing the main bundle size. The `ReducerManager` strictly cleans up state when a module is removed to prevent memory leaks, and supports `replace()` for hot-reloading.
2. **Strict Persistence Layers**: We use `redux-persist` powered by a custom `SecureStorageAdapter`.
   - Highly sensitive data (like the `auth` slice tokens) are **blacklisted** and managed securely via Expo SecureStore.
   - The persisted data is encrypted via `crypto-js` (AES). The key is stored in SecureStore and supports **Key Rotation** without data loss.
   - Migrations are version-controlled via `StoreVersionManager` with automatic **Rollback** on corruption.
   - On `STORE/RESET_ALL`, the Redux state is wiped, `persistor.purge()` is explicitly called, and the RTK Query cache is cleared, leaving zero traces.
3. **Cross-Slice Communication**: We strictly prohibit tightly coupled slices. We use `listenerMiddleware` to allow slices to react to actions from other slices without importing them directly.
4. **Offline First Mutations**: Handled through `HttpClient.ts` offline queues. Features deduplication locks, UUIDs, `X-Idempotency-Key` headers, `X-Correlation-ID` headers, and a `Conflict Resolution Hook`.
5. **Observability**: Built-in middleware (`observabilityMiddleware`) tracks Redux hydration time, cache size warnings, and slow reducers (exceeding 16ms frame budget).

## Architecture Flow
```
[ Component ] --> dispatch( action ) 
                  |
                  v
[ Middlewares ]
  - listenerMiddleware (Side effects)
  - baseApi.middleware (RTK Query Cache/Fetch)
  - memoryManagerMiddleware (OOM Prevention)
  - observabilityMiddleware (Metrics)
                  |
                  v
[ Root Reducer (ReducerManager) ]
                  |
                  v
[ PersistReducer (Encryption/Migration) ]
                  |
                  v
[ New State ] --> [ Component Re-renders via reselect Memoization ]
```

## Creating a new Slice
1. Define the slice using the scaffolding template.
2. If it is a large collection, use `createEntityAdapter` to normalize data.
3. Keep selectors inside the slice file, but compose them in `selectors.ts` if they depend on multiple slices.
4. Use the `FeatureRegistry.register()` inside the Module's entry point to inject it into the store.
