# Memory budget of the 3.8 GB production host (2026-10-30)

**Why:** run 50's read-only diagnosis of the host found, in 48 hours: 6 kernel OOM kills, 2.0 GB of swap in use, `MemAvailable` about 1.0 GB, and the `mongodb` container restarted 4 times (the last at 2026-10-30 00:40 UTC; `OOMKilled` false, so either the kernel killed mongod inside the container or a health check failed while it was swapped out). The four "Backup FAILED: oplog" mails line up with those restarts, and the "API availability: error budget burning fast" alert (23:12 to 23:20) with the same pressure. At rest: mongodb 708 MB, backend 388 MB, redis 108 MB, meilisearch small, plus patient-web, admin-web, worker, nginx, LiveKit; the translation script ran inside the backend container; ClamAV cannot start (it needs about 1.5 GB). The owner decided there is no RAM upgrade now, so everything below has to fit 3.8 GB.

Numbers marked *measured on the host* are from that diagnosis; every other limit below is an initial value that has **not** been measured on the host and is to be tuned from `memory-report.sh` after the first deploy.

## What changed
| Container | `mem_limit` | `mem_reservation` | swap | `oom_score_adj` | Node heap |
|---|---|---|---|---|---|
| mongodb | 1200m | 800m | none (`memswap_limit` = limit) | -900 | |
| redis | 512m | 160m | none | -800 | `maxmemory` 512mb -> 320mb |
| nginx | 128m | 30m | | -500 | |
| livekit, coturn | 256m, 128m | 80m, 30m | | -100 | |
| backend | 768m | 400m | | 0 | `--max-old-space-size=512` |
| worker | 640m | 200m | | 300 | 448 |
| patient-web | 640m (its two tmpfs, 160 MB, count against it) | 250m | | 300 | 384 |
| admin-web | 384m | 120m | | 300 | 256 |
| fastapi | 384m | 100m | | 300 | |
| redis-cache | 384m (unchanged) | 150m | | 300 | |
| meilisearch | 640m | 120m | | 200 | |
| clamav (on demand, `clamav-window.sh`) | 1536m | 600m | | 900 | |

* **Who the kernel kills first.** `oom_score_adj` orders the victims: ClamAV, then the worker, web apps, caches and search, the API last of the application containers, and mongod and redis after everything else. A container that reaches its own `mem_limit` is killed alone, inside its cgroup, instead of the kernel choosing a victim for the whole host.
* **mongod and redis never swap.** A swapped-out database answers slowly enough to fail health checks, which restarts it (what the 4 restarts look like). With `memswap_limit` equal to `mem_limit` they stay in RAM, and the swap goes to the processes that can bear it.
* **WiredTiger cache stays at 0.5 GB** (`deploy/mongo/mongod.conf`), which was already the setting: the working cache was not the cause. mongod's 708 MB at rest is the 0.5 GB cache plus connections and its own structures. The limit of 1200m leaves 400 MB above the cache for sorts, index builds and 20 to 200 pooled connections. Raising the cache would move memory out of the other containers into the page cache without removing the pressure.
* **Reservations add up to 2,440 MB** on a 3,800 MB host with 500 MB kept for the system; `test_compose_memory.py` fails the build if that sum, the oom order, the no-swap rule or a Node heap over 80% of its limit is broken.
* **Node heaps** are capped under their container limits so a leak ends in a Node out-of-memory exit and a container restart with a stack trace, not in the kernel killing a neighbour.
* **The translation run** (`97`, `98b`, `99` tasks) now execs in the **worker** container, not the API's: a spike in a background job no longer takes the API's memory.
* **ClamAV** has a 1536m cap and the highest kill priority: when `clamav-window.sh` starts it with memory free it can use what it needs, and if the host is short it is the first to go. It still cannot run next to everything else on 3.8 GB; that is unchanged.

## Oplog backup (`oplog-backup.sh`)
Before: a failed slice was retried once after 60 s. After an OOM kill mongod needs minutes to recover, so the retry failed too and the owner got one mail per restart. Now a failed slice waits (up to `OPLOG_HEALTHY_WAIT`, 240 s) until the `mongodb` container is running and healthy, then retries once (`OPLOG_RETRY_DELAY`, 20 s). Only a failure after that, or a Mongo that stayed unhealthy, is reported, and the mail says in one sentence whether Mongo restarted since the last good slice (restart count and start time, recorded at every good slice). A slice skipped during a deploy, or in the 300 s after a restart, stays quiet as before and never advances the state file, so the chain has no gap. Tested with a fake `docker` (`test_oplog_mongo_wait.py`).

## Deploy-time check
`deploy.sh` runs `scripts/memory-report.sh` after the health check. It prints `status:` lines (names and numbers only, no environment values): host total, `MemAvailable`, swap in use, OOM kill lines in the kernel log, and per container the use, limit, reservation, restart count, `OOMKilled` and `oom_score_adj`; and `WARN` lines for `MemAvailable` under 700 MB, swap over 256 MB, any OOM kill, a restarted container and a container without a limit. It never fails the deploy.

## To do on the host after the deploy (needs the owner)
1. Read the `status:` lines; replace the initial limits above with measured ones where a container sits near its limit.
2. Check `docker inspect` shows the `OomScoreAdj` values (compose applies them on `up -d`, which recreates the containers).
3. If swap is still in use with the limits in place, the total in use is over the host, not just badly shared: the options are then fewer containers (ClamAV stays off, LiveKit and coturn on their own small host) or the RAM, not more tuning.
