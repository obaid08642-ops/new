# Uploads on the 3.8 GB host: what users get, and the numbers (2026-10-30, run 59)

## What users get now
`UPLOAD_SCAN=defer` (task 91b) is what keeps uploads open without a running scanner. Whether it is applied on production is **not visible from the repo**: run `96c-uploads-state.sh`
(read-only) and it prints `UPLOAD_SCAN`, `/config` `uploads_enabled` / `uploads_pending_scan`, the scan queue (waiting / scanning / infected / failed / clean, and the age of the oldest
waiting file) for `storage_objects` and `media_assets`, the window script's own log counts, and the memory of every container. The deploy line
`clamav=SKIPPED_LOW_MEMORY ... uploads_refused_until_scanner_runs` is written for `UPLOAD_SCAN=required`; under `defer` it is misleading (patch below).

What the code does (backend `storage/clamav.service.ts`, `pending-scan.ts`):
- **required** (the production default when the variable is unset): an upload with no scanner answers 503; `/config` says `uploads_enabled=false`; the apps hide the upload buttons.
- **defer**: the upload is accepted into quarantine (`pending/`), never served; reading it answers `423 file_pending_scan`; the apps show "being checked". It becomes usable only after a scan.
  `clamav-window.sh` starts ClamAV only when `MemAvailable >= CLAMAV_MIN_FREE_MB` (1700). **On this host that never happens**: 915 MB were free at the run 59 deploy (about 1.0 GB in run 50).
  So under `defer` the files are accepted and then wait for ever: for a patient that is a prescription photo or a lab result that never opens, which is a refusal with extra steps.

## The numbers (MB; host 3,800, kernel/docker/sshd 500)
| | MB |
|---|---|
| reservations of the steady containers after #2186 (mongodb 1000, backend 400, patient-web 250, worker 200, redis 160, redis-cache 130, admin-web 100, meilisearch 100, fastapi 80, livekit 80, coturn 30, nginx 30) | 2,560 |
| + kernel/docker | 500 |
| left for ClamAV, page cache and spikes (reservations are floors, the real use is higher) | about 740 |
| measured `MemAvailable` at rest (run 59 deploy; mongodb at its old 1200m cap) | 915 |
| mongodb may now grow to 1600m: up to 400 more than before | 915 -> about 500 when it does |
| what clamd needs to load its signatures (`clamav-window.sh`, MEMORY_BUDGET_3_8GB.md) | 1,200 to 1,500 |
| shortfall to start it | 300 to 600 (mongod at 1200m) ; 700 to 1,000 (mongod at 1600m) |
| the most that stopping every optional container frees (admin-web 100 + fastapi 80 + meilisearch 100 + redis-cache 130, as reservations) | about 410 |

**ClamAV cannot run on this host next to the rest, even with every optional container stopped.** Swap would let it start, at the price of the API and web being paged out for the minutes
of a scan (the "others absorb the swap" rule of the memory plan was written for a rare event, not for every upload burst).

## Options (the owner chooses; none lowers the guarantee "never serve an unscanned file")
1. **A scanner on its own small server (recommended).** A 2 GB VPS (about US$5 to 7 a month, a separate server, not a RAM upgrade of this one) runs only ClamAV. The backend already speaks
   to a remote clamd (`CLAMD_HOST`, `CLAMD_PORT`, INSTREAM; `storage/clamav.service.ts`), so **no code change**: set the two variables, `UPLOAD_SCAN=required`, and uploads work with a real
   scan in seconds, no quarantine wait. The clamd port has no authentication: it must be reachable only from this server (provider private network, WireGuard, or a firewall rule on the
   main server's address). The file leaves this server for another one of ours, over that private link.
2. **Disarm images, scan the rest.** Images (prescription photos, chat pictures, many lab results) are re-encoded in the backend (the original stays in quarantine and is never served);
   PDFs and anything else wait for a scan window as today. This neutralises rather than detects, needs a product decision and new code, and still leaves PDFs waiting.
3. **Windows at quiet hours with the optional containers paused.** `clamav-window.sh` can now pause containers (`CLAMAV_PAUSE`, empty by default, started again when the scanner stops;
   tested), but the table above says it cannot free enough: it is only worth enabling together with swap and a measured quiet hour (the 96c numbers).
4. A RAM upgrade: the owner decided against it.

## In this PR
- `tools/ops/tasks/96c-uploads-state.sh`: the read-only diagnosis that answers "what do users get" with counts from production.
- `clamav-window.sh`: `CLAMAV_PAUSE` (empty by default, so nothing changes until chosen), with tests: stops the listed containers only when memory is short, only counts the pause if it frees enough
  (otherwise puts them back), starts them again when the scanner stops or is not running.
- `docs/ops/60-deploy-main-clamav-message.patch` (for `review/server-inspect`): with `UPLOAD_SCAN=defer` the deploy no longer prints "uploads_refused_until_scanner_runs" and does not start
  the ClamAV container when `CLAMAV_ON_DEMAND=1` (the window owns it); it prints what really happens to uploads.

## Update 2026-10-31 (run 76)
The deploy of `main@c929c4ef` skipped ClamAV with `SKIPPED_LOW_MEMORY` at **647 MB available**. The start needs `MemAvailable >= CLAMAV_MIN_FREE_MB` (1,700 by default in `clamav-window.sh`; clamd itself needs about 1,200 to 1,500 for its signatures), so the shortfall on this host is about 1,050 MB at this moment: still no start, with or without the optional containers (they free about 410 at most). The plan therefore stays as decided by the owner: ClamAV off here, the remote scanner (`docs/ops/REMOTE_CLAMD.md`, `CLAMD_HOST`, `CLAMD_PORT`, `UPLOAD_SCAN=required`) when it is ready.
Whether `UPLOAD_SCAN=defer` (91b) is live on the server is not visible from the repo: `96c-uploads-state.sh` (read-only) prints `UPLOAD_SCAN=...`, `/config` `uploads_enabled` and `uploads_pending_scan`, and the quarantine queue. `defer` is live when it says `UPLOAD_SCAN=defer` and `uploads_pending_scan=true`; with `unset` or `required` uploads are refused (503) until a scanner answers.

## Update 2026-11-09 (lane V): the window may count free swap
Runs 109 and 110 deployed with `clamav=SKIPPED_LOW_MEMORY` (MemAvailable 998 to 1,153 MB, the deploy needs 1,500), so with `UPLOAD_SCAN=required` uploads are refused. Owner decision: no RAM upgrade, no new server.
`clamav-window.sh` (every 2 minutes, `CLAMAV_ON_DEMAND=1`, `UPLOAD_SCAN=defer`) now counts as room for the scanner: MemAvailable (page cache is already in it) plus the free swap above `CLAMAV_SWAP_KEEP_MB` (1,024 MB), at most `CLAMAV_SWAP_HEADROOM_MB` (default 700; 0 = the old rule).
With 1,000 MB available and 3,000+ MB of swap free that is 1,700 MB, the window's minimum (`CLAMAV_MIN_FREE_MB`), so the scanner starts only while files wait, scans them, and stops 10 minutes after the queue is empty.
Why it is safe: mongodb cannot swap (`memswap_limit` = `mem_limit`), the scanner has `oom_score_adj` 900, so if memory runs out the kernel kills the scanner first, never the database; the files then stay in quarantine until the next window. Nothing is ever served unscanned.
The price: for the minutes of a scan the idle pages of redis, patient-web and the worker are paged out, so those answer slower. `96m-clamav-state` and `96c-uploads-state` (read-only) show the swap use and the queue; the first scan window after enabling should be watched with them.
Enabling on the server is task 91b (`UPLOAD_SCAN=defer` + `CLAMAV_ON_DEMAND=1` + the window cron, dry run first); no new variable is needed because the headroom has a default.
The deploy line should stop saying "uploads_refused_until_scanner_runs" under `defer`: `docs/ops/60-deploy-main-clamav-message.patch`, for `review/server-inspect` (the lead applies it).
