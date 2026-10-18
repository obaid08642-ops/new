# Health data protection (16.9, PDPL "sensitive" data)

## What is encrypted at rest (AES-256-GCM, a fresh random IV per value, `enc.v1:` prefix)
| collection | fields |
|---|---|
| `prescriptions` | `diagnosis`, `notes`, `items[].instructions` |
| `medicalreports` | `patient_name`, `summary`, `body`, `diagnosis`, `recommendations` |
| `appointments` | `summary.diagnosis`, `summary.notes`, `summary.recommendations` (the doctor's consultation summary), `patient_notes`, `sickLeaves[].reason` |
| `consultationnotes` | `notes`, `diagnosis` |

The registry is `backend/src/common/health-fields.ts` (`HEALTH_FIELDS`). Lookup keys (ids, states, dates, medicine names and doses) stay readable: they are how the platform finds and fills a prescription.

**How:** a Mongoose plugin on the three schemas encrypts on set and decrypts on get, so `save`, `create`, `insertMany`, `$set` updates, hydrated documents, `toObject()`/JSON, `.lean()` and `aggregate()` need no change in the callers. Code that talks to the driver directly (`conn.collection('prescriptions')`) calls `protectHealthDoc` before a write and `revealHealthDoc(s)` after a read; `health-fields-raw-access.spec.ts` fails when a new raw access to these collections appears that nobody reviewed. The PDPL export returns the decrypted copy to the patient.

**Never the fallback:** ciphertext that cannot be decrypted (no key, wrong key, tampered) raises an error; it is never shown to a user. A row written before the migration (plaintext) still reads and is encrypted by its next save.

**Search:** the free-text search over report summary/diagnosis is gone (titles only), because ciphertext cannot be matched.

## Keys
`FIELD_ENCRYPTION_KEY` (32 random bytes, base64 or hex: `openssl rand -base64 32`). Rotation: put the old key in `FIELD_ENCRYPTION_KEY_PREVIOUS` (comma separated), set the new one, restart; old rows decrypt, new writes use the new key; re-run the migration script to re-encrypt old rows under the new key, then drop the old key. **A sealed copy of the key must exist off the server: without it the data cannot be read, and the backups cannot be used.** With no key the backend logs `field_encryption_disabled` at every boot (production) and the admin Security page (`pdpl.data_protection.field_encryption_enabled`) shows it.

## Rollout (owner approves each step; server work goes through the server-ops workflow)
1. Generate the key, store the sealed copy, set `FIELD_ENCRYPTION_KEY` in `deploy/.env.production`, deploy.  From here every new write is encrypted.
2. Take a backup (step "Encrypted backups" below) and check it restores.
3. Dry run: `npx ts-node --transpile-only src/scripts/encrypt-health-fields.ts` (counts only).
4. Apply: `HEALTH_MIGRATION_CONFIRM=apply HEALTH_MIGRATION_BACKUP=<backup file> npx ts-node --transpile-only src/scripts/encrypt-health-fields.ts --apply`. Idempotent, guarded per row, read back and verified; a verification failure stops the run.

## Encrypted backups
`deploy/scripts/backup.sh` encrypts the dump with `gpg --symmetric --cipher-algo AES256` (integrity-protected) when `BACKUP_ENCRYPTION_PASSPHRASE_FILE` points at a file of 32+ characters, checks that the encrypted file decrypts to the same bytes, then removes the readable dump. The local copy and the off-server copy are both `*.gz.gpg`. `BACKUP_REQUIRE_ENCRYPTION=1` makes a backup fail (and keep nothing readable) when no passphrase is set; turn it on once the passphrase is in place (it is off by default so the D-33 behaviour does not change the day this ships). `restore-drill.sh` decrypts on the way in and fails clearly with a missing or wrong passphrase. The passphrase lives in the password manager and a sealed copy, not on the backup disk or in the bucket.

## Access log: who viewed which medical record
Every service that returns a medical record writes a row to `medical_access_logs` first (`logMedicalRead`): medical reports (read, by tracking id, lists, the doctor's shared inbox), prescriptions (read, every list), the consultation summary, and the raw `GET /reports/:id`. Row: actor id/role/kind, action, record kind, record id and IP (both encrypted), the patient (`subject_id`), device, user agent, request id, time.
- Patient: `GET /api/v1/medical-reports/access-log` - who looked at their records (including themselves), newest first.
- Admin: `GET /api/v1/admin/medical-access-log?patient_id&actor_id&record_kind&limit` (permission `medical.access_log.view`, read-only; the owner super-admin holds it) and the existing Security page (PDPL section).
- Retention: TTL index, `MEDICAL_ACCESS_LOG_RETENTION_DAYS` (default 1825 = 5 years, minimum 30). A failure to write a row never hides the record from its owner; it is an error line (`medical_access_log_failed`) with the request id.

## Retention and deletion schedule
| data | default | by |
|---|---|---|
| medical access log | 5 years | TTL index above |
| audit log by kind (medical 5 y, tax 6 y, security 1 y) | 23.5 `AuditRetentionService`, legal hold blocks | job |
| warn/error log lines | 30 days | 20.3 TTL |
| backups | 14 days on the server, 30 days off-server | `backup.sh`, bucket lifecycle |
| the medical records themselves | kept while the account exists; erased or anonymised on the patient's PDPL request | `PdplService.erasePatientData` |
**These periods are defaults, not decisions: the owner and the lawyer set them.** An automatic deletion of medical rows after N years is not built, because the period is theirs to decide.

## Not covered (stated, not hidden)
- Report attachments (`medicalreports.attachments[].base64`) and prescription photos (`upload_image`) are stored as base64 and are not field-encrypted; they sit in the database, covered by the encrypted backups and disk encryption. Moving them to private object storage with server-side encryption is the follow-up. Insurance documents are files in private object storage; their content is protected by the storage provider's encryption at rest, and the policy identifiers on the user's insurance record are not field-encrypted (they are used for matching).
- Other health-adjacent collections (vitals, allergies, medications, mood, maternity) are not yet in `HEALTH_FIELDS`.
- Disk/volume encryption of the database server and the Mongo role restrictions are server tasks for the owner.
