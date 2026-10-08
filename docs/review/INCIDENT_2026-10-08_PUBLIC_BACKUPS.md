# Incident 2026-10-08: database backups on the public CDN bucket

**What happened**
- `deploy/scripts/backup.sh` uploaded the nightly `mongodump` archive to `S3_BUCKET`.
- That bucket is the public bucket behind `cdn.nabd.plus`, the medicine images.
- So `https://cdn.nabd.plus/backups/nabd_<db>_<date>-030001.gz` answered 200 to anyone, and the names are predictable.

**Found**
- 2026-10-08, by the lead reviewer, while checking the backup setup.
- Only the response headers were read: 200, 117,534,504 bytes. No content was downloaded.

**Exposure**
- 68 objects, about two months of daily backups.
- There are no access logs, so we cannot say whether anyone downloaded them.
- Content: the whole application database.
  - It does **not** contain the server env file. Mongo, Redis, the JWT secret and API keys are not in the dump.
  - It does contain password hashes and any secrets stored in database collections.

**Containment (server-ops task 14, v2, run 37739544927, owner-approved)**
- 68 objects were removed from the bucket (68 → 0).
- The upload in the live `backup.sh` is gated off.
- The public URLs answer 404, re-checked independently.
- The 15 local backups are kept.
- Repo: PR #612 gates the upload in `deploy/scripts/backup.sh`.

**v1 note:** the first run reported success but changed nothing, because the root-only env file could not be read. The server-ops workflow marks a run green even when a task fails, so every ops result is now verified from the report and an outside check, never from the run status.

**Impact assessment (owner, 2026-10-08)**
- The project is not launched. There are no real patients or providers, only test accounts.
- The valuable data is the medicine catalogue (about 21k items), which is meant to be public product data.
- No personal data of real people, so no PDPL notification is due. The owner keeps this note as the record.

**Follow-ups (owner decisions 33–34)**
1. Backups go off the server to a **separate private** bucket.
2. The JWT secret is rotated, and test sessions are invalidated, as part of the next deploy (one restart, verified, with rollback), not as a separate restart.
3. An ops/security page in admin.
