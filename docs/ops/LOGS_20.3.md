# Central structured logs (20.3 follow-up)

One logger for the whole backend, searchable from the admin dashboard, with levels and without a new external service.

## The line
Every line written by the API (`service: backend`) or the queue/cron process (`service: worker`) is one JSON object on stdout:

| key | meaning |
|---|---|
| `ts` | ISO time |
| `level` | `debug` / `info` / `warn` / `error` |
| `service` | `backend` or `worker` (`PROCESS_ROLE`) |
| `module` | the Nest context or the `logEvent` module (`http`, `auth`, `security`, ...) |
| `event` | what happened (`http_request`, `slow_or_err`, `audit_record_failed`, ...) |
| `request_id` | the request id (`x-correlation-id`, kept only if it is a plain token, else a new UUID) |
| `user_id` | the account id only, set by the auth guard |
| `route`, `status`, `duration_ms` | for HTTP lines (route has no query string and ids are collapsed) |
| `details` | everything else the caller passed, after `maskPii` (phone, e-mail, national id, medical and secret keys; phone/e-mail/id-looking values) |

`common/structured-logger.ts` builds and masks the line (`logEvent`); `common/logger.service.ts` (`LoggerService`) is installed with
`app.useLogger(app.get(LoggerService))`, so `new Logger('X').warn(...)`, Nest's own lines and `logEvent(...)` end the same way. While Nest boots
(before the app exists) `common/winston-logger.ts` prints the same record through winston at `LOG_LEVEL`.
The 13 `console.*` calls in `backend/src` (outside `scripts/`; 9 in modules/config and 4 in `main.ts`) now use `logEvent`; a spec fails if one comes back.

## Levels
`LOG_LEVEL` = `debug|info|warn|error`. Unset: `debug` in development, `info` in production. A value that is not one of the four falls back to that
default (a typo must not silence the logs). Set in `deploy/docker-compose.production.yml` (`LOG_LEVEL: ${LOG_LEVEL:-info}` for `backend` and `worker`),
`deploy/.env.production.example` and `backend/.env.example`.

## Storage: `app_logs` (warn and error only)
- info and debug stay on stdout: the container's json-file log, capped at 20m x 3 per service (`tools/ops/check-compose-limits.py`).
- warn and error are also written to Mongo `app_logs`:
  - **TTL index** on `ts`, 30 days (`ts_ttl`); indexes on `level+ts`, `module+ts`, `request_id+ts` (partial: only lines that have a request id).
  - **Size cap** (no repeat of the 2026-10-16 disk outage): every 10 minutes the worker deletes the oldest lines while the collection is over
    `LOG_STORE_MAX_MB` (256) or `LOG_STORE_MAX_DOCS` (200,000). (A Mongo capped collection cannot carry a TTL index, so the cap is a trim.)
  - Each line is bounded (`details` cut at 4 KB); each process stores at most `LOG_STORE_RATE_PER_MIN` (600) lines a minute, so an error storm
    (about 1,000 errors in 5 minutes on 2026-10-16) cannot flood the database. Lines over the budget are counted (`dropped_in_this_process`, shown in the admin page).
  - Writes are batched (one `insertMany` per 2 s) and fail open: a database that is down loses log lines, never a request, and a failing write never logs (no loop).
  - `LOG_STORE=off` turns the store off (stdout only).

## Admin
- `GET /admin/logs` (permission `system.logs.view`, read-only). Filters: `level` (warn|error), `from`, `to`, `module`, `request_id`, `q` (escaped text search over event, module,
  route and message), `page`, `page_size` (max 100). Newest first.
- `GET /admin/logs/request/:id`: every stored line of one request, oldest first.
- Page **Admin > النظام > سجلات النظام** (`/admin/logs`): filters, table, line details, "all lines of this request", CSV of the rows on screen (formula-safe),
  six languages (ar, en, ur, hi, bn, fil; Arabic and Urdu mirror the page). The admin app has no i18n framework, so this page carries its own dictionary
  (`admin/src/utils/app-logs-i18n.ts`) with a test that keeps the six languages in step.
- `system.logs.view` is granted to the `admin` role (super admin has every permission); other roles get 403. It appears in the RBAC permission catalogue.

## How to use it
1. A user quotes a request id (the `X-Correlation-ID` response header) or you copy one from Sentry: paste it in "معرّف الطلب".
2. Open a line > "كل أسطر هذا الطلب" to read the request in order.
3. For info/debug lines: `docker logs --since 10m nabdah-backend | grep <request id>`.

## Not done (needs the owner)
No Grafana/Loki or other external log service. Sentry keeps receiving errors as before; this is the first place to look, not a replacement.
