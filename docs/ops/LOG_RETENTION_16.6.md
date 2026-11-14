# Errors, logs and the audit trail (16.6)

## What a client sees
Any server fault (HTTP 5xx) answers `{ statusCode, code, message, error_id }`. In production `message` is always `Internal server error`; `code` is
`INTERNAL_ERROR`, or the machine code of a deliberate exception (e.g. `UPLOAD_SCANNER_UNAVAILABLE`) because clients switch on it. `error_id` is the request
id and equals the `X-Correlation-ID` response header. No stack, driver text, host name or SQL/Mongo detail reaches the client (`common/sentry.filter.ts`).
Outside production a deliberate `HttpException` keeps its message for developers; an unexpected error never does.

## What the log keeps
One line `exception` (level error, `request_id` = `error_id`) with the error name, message and the first 8 stack lines, after `maskPii`. Search it in
Admin > System logs by the id the user quotes (20.3, `docs/ops/LOGS_20.3.md`).

## Masking (`common/structured-logger.ts`, `maskPii`)
By key name: phone, mobile, tel, e-mail, user/full/first/last name, national id, nid, iqama, passport, address, diagnosis, prescription, medical*, medication,
allerg*, symptom, complaint, lab result, vitals, health record/data/condition, dob, birth, insurance/policy number, IBAN, password, token, secret, api key, otp,
code, cvv, card. By value: anything that looks like a phone number, an e-mail address or a 10-digit id, under any key. `tools/live/j_log_scan.py` scans the
backend log of the whole live-gate run and fails on one unmasked phone, e-mail or national id.

## Retention
| data | where | kept | how it goes |
|---|---|---|---|
| warn/error lines | Mongo `app_logs` | 30 days | TTL index on `ts`; size cap 256 MB / 200k lines |
| info/debug lines | container stdout | 20 MB x 3 files per service | docker json-file rotation |
| audit log (`audit_logs`) | Mongo | by kind (23.5): tax/invoice 6 y, medical 5 y, security 1 y; legal hold blocks | `AuditRetentionService`, leaves a tombstone per removed chain link |

The periods are the defaults of 23.5 and 20.3 and are the owner's and the lawyer's to confirm.

## The audit log is append-only
`audit_logs`, the admin `auditlogs` and `provider_audit_logs` refuse every update, replace, delete and re-save through the model (`common/append-only.ts`:
`AppendOnlyViolation`). `AuditService` only creates rows, chained by hash (23.3). The one removal is the retention job above, which uses the driver
directly, leaves a tombstone and is not reachable from a controller. A database user with write access can still edit the collection: restricting the
application's Mongo role to insert/find on those collections is a server task for the owner.
