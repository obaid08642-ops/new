# ClamAV scan window on the 3.8 GB host: three ways, the numbers, and the smallest change (2026-11-02)

Question: files wait in quarantine for ever (`UPLOAD_SCAN=defer`) because `clamav-window.sh` never finds the memory to start ClamAV. What is the smallest change that makes a scan really run?

## The numbers (all from this repo's earlier measurements; nothing new is measured by this PR)
| | MB | source |
|---|---|---|
| free memory at the last deploy (run 76) | 647 | `UPLOAD_SCAN_3_8GB.md` (run 59 saw 915) |
| start rule of the window script | 1,700 | `CLAMAV_MIN_FREE_MB` in `clamav-window.sh` |
| clamd's own need for its signatures | 1,200 to 1,500 | `UPLOAD_SCAN_3_8GB.md`, `MEMORY_BUDGET_3_8GB.md` (container cap 1,536) |
| shortfall against the rule | about 1,050 | 1,700 - 647 |
| shortfall against clamd's smallest need plus 100 MB margin | about 650 | 1,300 - 647 |
| freed by pausing the optional containers (admin-web, fastapi, meilisearch, redis-cache), as reservations | about 410 | `UPLOAD_SCAN_3_8GB.md` |
| swap in use in the 48 h of run 50 | 2,000 | `MEMORY_BUDGET_3_8GB.md` |

## Option 1: lower ClamAV's memory (not recommended)
The 1.2 to 1.5 GB is the signature database itself, resident for as long as clamd runs. The container cap is already 1,536m; lowering the cap does not lower the need, it makes clamd get killed while it loads. The only lever is loading fewer signatures, which lowers detection; that is a security decision and its saving on this host is **not measured**. Lowering `CLAMAV_MIN_FREE_MB` to 1,300 still leaves a shortfall of about 650 MB. Not a fix.

## Option 2: a nightly window on this host (possible only by taking things down)
- Pausing the optional set frees about 410: 647 + 410 = 1,057, **still under clamd's smallest need plus margin (1,300)**.
- Adding the worker (reservation 200) gives about 1,260: the margin is gone (cron jobs and queues stop meanwhile).
- Adding patient-web (reservation 250) gives about 1,510: it fits only with the **public website down** for the scan, and with `CLAMAV_MIN_FREE_MB` lowered to about 1,300 to 1,500.
- `clamav-window.sh` runs every 2 minutes all day. A *nightly* window also needs a small hour guard in the script (not built: it is only worth building if the numbers below say a window can fit at all).
- These use **reservations**, which are floors; the real use is higher. `tools/ops/tasks/96e-clamav-fit.sh` (this PR) does the same arithmetic with the real `docker stats` and `MemAvailable` of the host, set by set, and prints "window starts: yes/no" with the rule and the shortfall. Run it at a quiet hour (and once at the busy hour) before anyone changes a setting.

## Option 3: the remote scanner (recommended; no code, no RAM here)
Four lines in `.env.production`: `CLAMD_HOST`, `CLAMD_PORT`, `UPLOAD_SCAN=required`, `CLAMAV_ON_DEMAND=0`, then recreate `backend worker` (`docs/ops/REMOTE_CLAMD.md`, steps 1 to 8; the backend already speaks to a remote clamd). A 2 GB server runs only clamd (about US$5 to 7 a month, or the free Ampere VM in that document). Files already in quarantine are scanned within a minute of the scanner answering. Readiness is checked first, read-only, by `96d-clamd-check.sh` (`CLAMD_TEST_HOST`/`CLAMD_TEST_PORT`). Owner said the server is ready; what is missing is the WireGuard link and the switch, which need the owner or the reviewer on the servers.

## Recommendation
1. Run `96e-clamav-fit.sh` once (read-only). Expected from the numbers above: "no" for the current state and for set A, "marginal/no" for set B, "only by pausing patient-web" for set C. If it says otherwise, this document is wrong and the measured numbers win.
2. Switch to the remote scanner (option 3). It is the only choice that keeps the site up and the scan in seconds.
3. Until it is live, the product call in `CLAMAV_PLAN.md` stands: `defer` keeps the file but it waits for ever; `required` is honest and hides the upload buttons.
4. Do not build the nightly guard unless step 1 shows a set that fits and the owner accepts what it pauses.

## What this PR contains
`tools/ops/tasks/96e-clamav-fit.sh` (read-only, dry run only: it starts, stops and writes nothing) with `tools/ops/tests/test_clamav_fit.py` (fake docker and meminfo), and this document. Not verified: the real memory of the host (no access from here), the effect of removing signatures, the time clamd takes to load on this CPU.
