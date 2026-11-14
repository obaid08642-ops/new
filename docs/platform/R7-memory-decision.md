# R7 - mongod memory: what is fixed, what the owner must decide (2026-11-14)

Written for the owner. The code side is done in small PRs; the root cause on a 3.8 GB host is not something code alone can remove.

## What was measured (not guessed)
| fact | number | source |
|---|---|---|
| mongod kills | `CONSTRAINT_MEMCG` at its own 1.6 GB container limit, anon-rss 1.63 GB, restarts=703, bursts such as 6 kills in 2 minutes (03:42-03:44 UTC) | run 128 |
| total use of the host | about 2.6 GB of 3.8 GB with traffic only | run data, lead note 2026-11-14 |
| steady mongod (run 81, 99n) | cgroup anon 790 MB, tcmalloc heap 823 MB of which 238 MB free | `docs/ops/MEMORY_BUDGET.md` |

So mongod sits near 0.8 GB at rest and reaches 1.6 GB only when something makes it read or sort a lot: nightly jobs, dumps, crawlers on the catalogue, the translation job.

## What the code now does (one PR each, all in the repo)
1. Alert mail: at most one mail per alert key per 2 h across restarts (#2678).
2. Public pages: bot rate limit for `/p/*` and `/c/*`, so crawlers do not turn into database load (#2679, `docs/platform/WEB-BOT-LIMIT.md`).
3. Nightly jobs: heavy jobs run one at a time (Redis lease), 30 min apart, none in 02:45-04:15 UTC (the 03:00 dump window); queries stream with `batchSize` 200, `allowDiskUse`, `maxTimeMS`; the audit-chain walk no longer sorts the whole collection in memory (#2680).
4. This PR: `cacheSizeGB` 0.6 -> 0.4 (about 200 MB less anon at the cap). `mem_budget.py` and `MEMORY_BUDGET.md` follow the same number; the cache-share test still holds (0.4 GB is 26% of 1.6 GB).

## What I am NOT putting in `mongod.conf` yet
A parameter name this build rejects stops mongod from starting, so these are proposals to test on a throwaway `mongo:7.0` container first (task `98g`-style: `docker run --rm mongo:7.0 mongod --setParameter <name>=<value> ...`, it must start and `db.adminCommand({getParameter:1, <name>:1})` must return the value):

| parameter | proposed | why |
|---|---|---|
| `internalQueryMaxBlockingSortMemoryUsageBytes` | 33554432 (32 MB; default 100 MB) | a sort that is too big fails with an error instead of growing the process |
| `internalDocumentSourceGroupMaxMemoryBytes` | 33554432 | `$group` spills to disk (with `allowDiskUse`) earlier |
| `tcmallocReleaseRate` | 5 | already applied at runtime by `98n`; add to the file only after it was seen to work |

Not decided here: these cap memory per query; they do not stop 300 connections or a large index build. Verify with the 96j output after the next recreate.

## Why code cannot finish this on 3.8 GB
`sum(reservations) + largest one-off + reserve` already equals 3772 of 3800 MB (`docs/platform/R1-memory-budget.md`). mongod's 1.6 GB limit is 42% of the host. With nightly jobs plus traffic plus a dump, the peak is above what the limit allows, however well the jobs are scheduled. Lowering the limit makes mongod die earlier; raising it takes memory from the other containers. The jobs and cache changes lower the peak and the frequency of kills; I cannot promise zero from the repo.

## Options for the owner (prices: verify with the provider before buying, none is quoted here)
| | what | mongod headroom | downtime | repo work | risk |
|---|---|---|---|---|---|
| **(a) resize the same VPS to 8 GB** | in-place resize at the provider, same IP | `HOST_RAM_MB=8192`, `mem_budget.py render --write` gives mongod about 2x limit and cache; the nightly jobs fit with room | minutes (reboot) | none beyond the number (procedure in R1) | OVH had no larger VPS in stock on 2026-10-31 (`docs/ops/SERVER_MOVE.md`): check stock first, fallback Hetzner |
| (b) mongod on its own small VPS | follow `docs/platform/R7-data-tier.md` (private link, bind only on it) | the whole VPS RAM is mongod's | a planned window, then connection strings change | tasks 100-102 exist | health data leaves the host: check residency (R19); two hosts to keep up |
| (c) managed MongoDB | provider runs it | managed | migration window | connection string + restore | needs an approved price and region; not recommended unless the owner approves both |

**Recommendation: (a) now.** It is the smallest change, no new component, no data movement, and it removes the cause (RAM) instead of the symptoms. Keep the code changes above in any case. Then (b) only when the standby VPS (R15) exists.

## What I need from the owner
One decision: (a), (b) or (c). If (a): confirm the provider's larger size is available; then the lead runs `echo 8192 > deploy/HOST_RAM_MB && python3 tools/ops/mem_budget.py render --write`, updates the table in `docs/ops/MEMORY_BUDGET.md` and its test constants in the same PR.

After the next night I will ask the lead for the 96j and `dmesg` kill count: a drop in kills after #2680 and the cache change is the check, a repeat is the reason to do (a) at once.
