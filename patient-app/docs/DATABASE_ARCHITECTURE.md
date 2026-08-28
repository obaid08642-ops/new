# Database & Sync Architecture

## 1. Overview
The Nabdah Plus data layer is designed around an **Offline-First** philosophy using **Expo SQLite**. It provides a robust synchronization engine ensuring high availability even when the device is disconnected.

## 2. Core Principles
- **No Direct SQLite Calls in UI:** Components must use the Redux Store or Repositories.
- **Repository Pattern:** `IRepository` abstracts data sources (`SQLiteDataSource` and `RemoteDataSource`).
- **Offline-First:** All writes hit the local database immediately and are queued for background synchronization.
- **Auditing & Soft Deletion:** `created_at`, `updated_at`, `deleted_at` are mandatory on all business entities.
- **Unit of Work:** Transactional safety when modifying multiple tables.

## 3. Architecture Layers
1. **Database Manager:** Manages the Expo SQLite connection pool and low-level transaction context.
2. **Local Data Source:** `SQLiteDataSource` provides auto-translation from `QuerySpecification` to SQL queries.
3. **Remote Data Source:** `RemoteDataSource` talks to backend REST APIs using the `HttpClient`.
4. **Composite Repository:** Coordinates between Local and Remote. It acts as a Read-Through cache and a Write-Through queue.
5. **Sync Engine:** 
   - `EventBus` listens for local mutations.
   - `SyncManager` schedules background jobs.
   - `ConflictResolver` applies LWW, Server Wins, Client Wins, or Merge strategies based on `sync_metadata`.

## 4. Migration Strategy
Migrations are handled by the `MigrationRunner`. Schema versions are tracked in the `migration_history` table.
- Atomic updates inside `TransactionManager`.
- Forward-only approach for standard updates.
