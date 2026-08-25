# Phase 0B semantic evidence — Database backup/restore script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/db-backup-restore.sh:1–60`

The shell tool defaults `MONGO_URL` to `mongodb://localhost:27017`, `DB_NAME` to `nabd_nestjs`, and writes to a relative `./backups` directory (`1–6`). There is no environment/database identity assertion, production guard, operator authorization, host/account confirmation, secrets handling policy, filesystem permission/ownership setup or protected destination requirement. A relative backup path is dependent on the caller's working directory and can place sensitive dumps in an unexpected location.

The `backup` action creates a timestamped gzip archive and invokes `mongodump` using the URI and database name (`21–34`). It does not enable encryption at rest/in transit beyond whatever the URI happens to specify, redact secrets/PII, verify TLS/certificate policy, fsync/consistent snapshot semantics, archive integrity, checksum/signature, object immutability, retention, off-site replication or restore metadata. Timestamp granularity can collide on rapid reruns; there is no lock or atomic temporary-to-final rename. The script relies on checking `$?` after the command rather than a structured backup manifest or verified artifact.

The `restore` action accepts an arbitrary file path after only an existence check and invokes `mongorestore --archive=... --gzip --drop` (`36–56`). `--drop` destructively removes target collections before restoration. There is no backup-of-target checkpoint, dry-run, environment/DB confirmation, compatibility/schema/index check, malware/archive validation, path trust policy, transaction boundary, canary restore or rollback if restoration fails partway. It does not verify that the archive belongs to the selected database, is complete, was produced by this system, or contains no sensitive/untrusted payload. Success is printed solely from the command exit code, without post-restore record/count/index/health verification. The script was not executed; no product code was changed and no tests/builds were run during this semantic read.
