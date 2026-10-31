# Memory budget of the production host (3.8 GB)

Why: run 69 (2026-10-31). `nabdah-mongodb` restarted during run 68 although its own cgroup `memory.events` were all 0: the **host** ran out of memory, and the kernel killed `mongod` 15 times and `meilisearch` 11 times in 3 hours (MemAvailable 535 MB, no swap). The sum of the container limits in `deploy/docker-compose.production.yml` was about 8 GB on a 3.8 GB host.

`tools/ops/tasks/98-memory-report.sh` (read-only) shows the live numbers and answers why `mongod` is chosen; `tools/ops/tasks/98c-swapfile.sh` adds the swap file. The tests `tools/ops/tests/test_memory_budget.py` keep the table below equal to the compose file and the sums right (next to the existing `deploy/scripts/test_compose_memory.py`; `deploy/scripts/memory-report.sh` is the short check `deploy.sh` runs after a deploy, `98-memory-report.sh` the deeper diagnosis).

## The rule

The limits are ceilings, not guarantees, so they cannot all be reached at once on 3.8 GB. What has to fit is:

> steady use of the always-on containers (their `mem_reservation`) + the largest one-off container + the host's own use <= MemTotal

| input | MB | source |
|---|---:|---|
| MemTotal | 3800 | the host (owner decision 2026-10-30: no RAM upgrade); the same figure as `deploy/scripts/test_compose_memory.py` |
| host's own use (kernel, dockerd, containerd, sshd, cron, page-cache floor) | 500 | the `OS_RESERVE_MB` of `deploy/scripts/test_compose_memory.py`: an **assumption**, not measured here; `98-memory-report.sh` prints MemTotal, the sum of the containers' use and MemAvailable, so it can be checked and replaced by the measured number |
| steady use of the always-on containers (sum of reservations, ClamAV excluded) | 2560 | table below |
| largest one-off container | 700 | `90-catalogue-apply.sh` ONE_OFF cap (was 900); the nightly dump is capped at 350 to 600 by `_mongodump-oneoff.sh` |
| **sum** | **3760** | must be <= 3800 (test) |

Left over: 40 MB, plus the 2 GB swap that only some containers may use. That is thin: the table assumes the reservations are what the containers really use in steady state; if the memory report shows they use more, the limits below have to come down further or a service has to go (see "ClamAV").

One one-off at a time: never start the catalogue apply while the nightly dump (03:00 UTC) runs, and never during a ClamAV window.

## The table (`deploy/docker-compose.production.yml`)

| service | mem_limit | reservation | swap allowance | node heap | oom_score_adj | change in this PR |
|---|---:|---:|---:|---:|---:|---|
| mongodb | 1600m | 1000m | 0 (memswap = limit) | | -900 | none |
| redis | 512m | 160m | 0 (memswap = limit) | | -800 | none |
| redis-cache | 384m | 130m | 0 | | 300 | memswap = limit (a swapped-out cache is useless) |
| meilisearch | 448m | 100m | 192m | indexing 128Mb | 200 | limit 640m -> 448m, `MEILI_MAX_INDEXING_MEMORY` 256Mb -> 128Mb, swap allowance |
| backend | 704m | 400m | 256m | 448 | 0 | limit 768m -> 704m, heap 512 -> 448, swap allowance |
| worker | 512m | 200m | 256m | 352 | 300 | limit 640m -> 512m, heap 448 -> 352, swap allowance |
| fastapi | 384m | 80m | 128m | | 300 | swap allowance |
| admin-web | 384m | 100m | 128m | 256 | 300 | swap allowance |
| patient-web | 640m | 250m | 256m | 384 | 300 | swap allowance |
| livekit | 256m | 80m | 0 | | -100 | memswap = limit (latency) |
| coturn | 128m | 30m | 0 | | -100 | memswap = limit |
| nginx | 128m | 30m | 0 | | -500 | memswap = limit |
| clamav | 1536m | 600m | 0 | | 900 | memswap = limit; see below |

Heaps are at most 75% of the limit (the rest is native memory). The swap allowances add up to 1216 MB, below the 2048 MB swap file, so the allowances can never exceed the swap that exists. `mongodb` and `redis` are off swap by their own `memswap_limit` (a swapped-out database is slower than a restart); the swap file is for the others to absorb spikes (indexing, a build, a leak) instead of the kernel killing a database.

One-off containers (not in the compose file): the nightly dump 350 to 600 MB (no swap, `oom_score_adj` 1000), the catalogue apply 700 MB (no swap, `oom_score_adj` 1000, heap 520). Both are the first thing the kernel kills.

## ClamAV (decision for the owner, not made here)

ClamAV needs about 1.1 to 1.3 GB while it holds the signature database (limit 1536m). It is **not** in the steady sum above because uploads were made on-demand ("scanner up in a window"). If the memory report shows `nabdah-clamav` running outside a window, that alone is the largest single saving (about 1.1 GB): stop it between windows. While it runs, nothing else fits in RAM, so a window must not overlap a one-off task or the nightly dump.

## Why mongod is picked although it has `oom_score_adj` -900

With -900 its kernel score is at most 1, so the kernel should pick it last. The memory report prints, for each kill, the `oom_score_adj` the victim had and the container it ran in, and the `oom_score_adj` the live process has now. Either the value did not reach the killed process, or it was not `nabdah-mongodb` (a temporary `mongod` of a restore drill or a recreate starts with 0), or nothing else was left to kill. The report's last line says which.

## After the swap file (order of the tasks)

1. `97d-old-checkouts.sh` (disk 87%: the swap file needs room), then 2. `98c-swapfile.sh`, then 3. deploy this compose change, then 4. `98-memory-report.sh` again and replace the host and steady numbers above with the measured ones.
