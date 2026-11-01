# ClamAV on the 3.8 GB host: the plan after run 77 (2026-11-01)

Facts from the server (run 77, read-only `96c-uploads-state.sh`) and from the repo:

| | |
|---|---|
| `UPLOAD_SCAN` | `defer` (91b is live) |
| `/config` `uploads_enabled` | `true` |
| free memory at the last deploy (run 76) | 647 MB available |
| what the window script needs to start ClamAV | `MemAvailable >= CLAMAV_MIN_FREE_MB` = 1,700 MB (clamd itself needs about 1,200 to 1,500 MB for its signatures) |
| shortfall | about 1,050 MB, and stopping every optional container frees about 410 MB at most (numbers in `UPLOAD_SCAN_3_8GB.md`) |

## What this means for users today
With `defer` live and `uploads_enabled=true`, an upload (prescription photo, chat file, lab result) is **accepted into quarantine and never served** (`423 file_pending_scan`). Because the window script cannot start ClamAV on this host, those files **wait for ever**: they are never scanned and never become usable. For the patient this is a refusal with extra steps, without the honest message that a refusal would give. The guarantee "never serve an unscanned file" holds; the promise "your file is being checked" does not.

## Decision for the owner (none lowers the guarantee)
1. **Remote scanner (recommended, owner said it is ready).** Set `CLAMD_HOST`, `CLAMD_PORT`, `UPLOAD_SCAN=required` (`docs/ops/REMOTE_CLAMD.md`); scans take seconds, no quarantine wait, no RAM here. Until it is live, files already in quarantine are scanned the moment the scanner answers.
2. **Until then**, either keep `defer` and accept that new uploads wait, or set `UPLOAD_SCAN=required` so the apps hide the upload buttons and say so honestly. Which one is a product call: `defer` keeps the file (and the patient's effort) at the cost of a promise that is not kept today; `required` is honest and loses nothing already stored.
3. A RAM upgrade or a bigger host (`docs/ops/SERVER_MOVE.md`) would also make the window work (about 1.7 GB free needed).

## The window script on the server differs from the release (cause and fix)
The deploy task (`60-deploy-main.sh`) installs only the compose and nginx files. `91b-upload-scan-defer.sh` installed `clamav-window.sh` and `_backup-common.sh` **once**, and `91c-host-files.sh` refreshed only five other files, so nothing has updated these scripts on the server since. The same applies to the nightly backup: `backup.sh` and the helpers it sources are whatever was last copied by hand, so **the nightly size guard of #2319 (`backup.sh` + `_dump-guard.sh`) reaches the server only if these files are installed**.

Fix in this PR: `91c-host-files.sh` now also carries `scripts/clamav-window.sh`, `_backup-common.sh`, `backup.sh`, `_dump-guard.sh`, `_mongodump-oneoff.sh` and `_mongorestore-list.sh` from the uploaded release. Same two-run shape as before: the dry run prints which files differ (name and sha8 only), `APPLY=yes` saves a copy of each, installs, and rolls back on a failure. `backup.sh` and `_dump-guard.sh` travel together on purpose: a `backup.sh` that sources a `_dump-guard.sh` the server lacks would treat every dump as suspect.

## Order to run
1. `96c-uploads-state.sh` (read-only): confirm `defer`, the queue size and the age of the oldest waiting file.
2. `91c-host-files.sh` dry run, read the list, then `APPLY=yes` (after review).
3. Owner decision on 1 or 2 above.
