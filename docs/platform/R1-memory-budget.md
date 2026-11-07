# R1 - Memory budget that scales with the host (2026-11-02)

Incident: the 3.8 GB production host hung (no SSH, Cloudflare 522 for hours, the on-host monitor sent nothing). The kernel was thrashing, not killing; sshd and the monitor starved with everything else.

## What this PR adds

| piece | file | what it does |
|---|---|---|
| host size | `deploy/HOST_RAM_MB` | one number (3800 today). The owner's RAM upgrade = change this number. |
| budget model | `tools/ops/mem_budget.py` | `check`: compose + `mongod.conf` equal the plan for that host and the budget holds (exit 1 otherwise). `render [--write]`: prints / writes the per-container `mem_limit`, `mem_reservation`, `memswap_limit`, Node heap and WiredTiger cache for a host size. |
| CI | `tools/ops/tests/test_mem_budget_tool.py`, step in `ops-tasks-tests.yml` | fails if a limit or reservation is raised past the budget, if the host file changes without `render --write`, or if limits drift over the ratchet. |
| OOM protection | `tools/ops/tasks/98p-earlyoom.sh` (+ `tests/test_earlyoom.py`) | dry run first. APPLY installs earlyoom (kills at MemAvailable < 5% and swap free < 10%, never mongod/redis/sshd/dockerd, prefers clamd/meilisearch/node), creates a 2 GB swapfile only if the host has less than 2 GB of swap, gives sshd `OOMScoreAdjust=-1000`. ROLLBACK removes the config (swap stays). |

The existing guards stay: `tools/ops/tests/test_memory_budget.py` (doc table = compose), `deploy/scripts/test_compose_memory.py`, `oom_score_adj` per service, the 4 GB swap already on the host.

## The rule

    sum(mem_reservation of always-on containers) + largest one-off (700 MB) + reserve <= HOST_RAM_MB
    reserve = max(512 MB, 10% of host)         (OS, dockerd, sshd, page cache floor)

3800 MB host: 2560 + 700 + 512 = 3772 <= 3800. ClamAV is not steady (remote scanner / window).

Larger hosts: the scalable services (mongodb, redis, meilisearch, backend, worker, patient-web) grow by one factor `f` (>= 1, steps of 1/16, max 8) so the reservations fill the free budget; small services (nginx, coturn, livekit, fastapi, admin-web, redis-cache) stay fixed. Examples: 8192 MB -> f 2.94 (mongod limit 4688m, cache 1.75 GB); 16384 MB -> f 6.44. Heap stays <= 75% of the limit and the WiredTiger cache <= 40% of the mongod limit (the 2026-11-01 rule).

## Honest limit: the *sum of limits* is not below the host

The owner asked for limits that sum below host RAM minus the reserve. On 3.8 GB that is not reachable without setting limits under the measured use: run 70 measured mongod 1239 MB, meilisearch ~620+ MB while indexing, patient-web 274, backend 330, redis 136, worker 128 = about 2.7 GB steady, and mongod spiked past 1.2 GB (restarted 32 times at a 1200m limit). Always-on limits sum to 6144 MB (2.40x the reservations). Cutting them to fit 3288 MB would turn today's rare host-wide stall into frequent single-container OOM kills.

What this PR does instead:
1. **Reservations (the part the kernel protects) fit the budget**, enforced by CI at every host size.
2. **Limits are ratcheted**: `OVERCOMMIT_CEILING = 2.4` (limits / reservations) may only go down.
3. **earlyoom + sshd protection** act before the kernel thrashes, so an overcommit spike kills the right container (meilisearch/clamav first, never the databases) and SSH stays reachable.

Options for the owner (cost decision, not made here): (a) stay on 3.8 GB with this protection; (b) upgrade RAM: set `deploy/HOST_RAM_MB`, run `render --write`; the plan for 8 GB and 16 GB is in `render` output above; prices and providers are in `docs/ops/SERVER_MOVE.md`; (c) move meilisearch / ClamAV off the host (R7, R9), which removes ~1.5 GB of limits.

## Rollout (the lead reviewer prepares the production run)

1. Merge. 2. Add `98p-earlyoom.sh` to `tools/ops/RUN` on `review/server-inspect`: first run dry (prints earlyoom/swap/sshd state), second run `APPLY=yes`. 3. Verify: `systemctl status earlyoom`, `swapon --show`, `systemctl show ssh -p OOMScoreAdjust` after the next ssh restart. 4. `98-memory-report.sh` a day later: no `CONSTRAINT_NONE` kills, earlyoom log lines name only meilisearch/clamd/node.

Upgrade procedure: `echo 8192 > deploy/HOST_RAM_MB && python3 tools/ops/mem_budget.py render --write`, update the table in `docs/ops/MEMORY_BUDGET.md` (its test pins the 3800 numbers; change the test constants in the same PR), run the tests, deploy.
