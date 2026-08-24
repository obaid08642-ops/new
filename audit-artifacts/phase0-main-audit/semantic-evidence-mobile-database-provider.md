# Semantic evidence — Mobile Database Provider

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/src/data/database/core/DatabaseProvider.native.ts:9–24` exposes a factory accepting `sqlite` or `sqlcipher`, but the `sqlcipher` branch explicitly throws `Error('SQLCipher driver not yet implemented')` (`:14–20`).

`getConnection` always requests `createDriver('sqlite')` regardless of configuration (`:26–32`). Therefore, this file does not provide SQLCipher-backed storage on native; selecting the SQLCipher option fails closed, while normal connection creation uses unencrypted SQLite unless a separate storage/encryption layer is proven elsewhere.

A repository trace found `src/data/database/core/DatabaseManager.ts:2,31` imports `DatabaseProvider` and calls `DatabaseProvider.getConnection(dbName)`, while both `DatabaseProvider.native.ts:29–32` and `DatabaseProvider.web.ts:35–37` construct the SQLite driver. The provider is therefore reachable through the database manager, although the trace still does not prove which entities/data are persisted there or whether sensitive PHI/session/cache data uses this path.

`src/data/repositories/sources/SecureDatabaseProxy.ts:7–13,15–45,58–79` provides app-level encryption/decryption for a caller-supplied list of fields using `EncryptionService`, including encrypted filter matching. However, the proxy is only an architectural wrapper; this evidence does not show which repositories instantiate it, which PHI/session/cache fields are included, whether the encryption key is device-bound/rotated/recoverable, or whether all queries avoid plaintext leakage.

This remains a verification candidate rather than a confirmed production security defect until repository wiring, encrypted-field coverage, key management, migration path, device threat model and actual PHI/session/cache persistence are fully traced. No Phase 0 remediation was made.
