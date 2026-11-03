# R7 - Data tier: replica set, PITR, pools, what moves off the host (2026-11-03)

Owner topology (2026-11-02): launch on ONE bigger VPS (8-16 GB), self-hosted, no managed service without an approved price. Everything below works on one host first and splits later without code changes (connection strings and member hosts are config).

## Where we are (found in the repo)
- MongoDB 7 in Docker, a **single-member replica set** `rs0` (`deploy/mongo/mongod.conf`). One voting member: no failover, no read scaling.
- PITR exists: nightly encrypted dump + an oplog slice every 10 minutes, shipped to a private bucket (`deploy/scripts/oplog-backup.sh`), monthly restore drill (`dr-drill.sh`) with targets **RPO 900 s, RTO 3600 s**. The brief's target is **RPO < 1 min, RTO < 15 min**: the slice interval alone makes 1 min impossible with this design.
- The driver pool was 200 per process against `maxIncomingConnections: 300` (api + worker could ask for 400, ~1 MB each). **Fixed in this PR** (below).

## Target and the three ways to reach it
| | RPO | RTO | Needs | Cost (indicative, verify before buying) |
|---|---|---|---|---|
| **A. Keep dump + 10-min slices, tighten** (slice every 1 min, same bucket) | ~1-2 min, but only while the oplog window and the shipping keep up | restore time of the dump + replay: measured by the monthly drill, not yet below 15 min on a grown database | nothing new | bucket storage only |
| **B. Standby VPS: hidden secondary + arbiter** (primary on the app host; secondary on a small VPS; the arbiter can sit on the same small VPS) | seconds (replication lag) | minutes for the database (promote); the APP must also start somewhere (R15b) | one small VPS, WireGuard between hosts, keyFile + TLS | one small VPS: indicative EUR 4-5 per month for a 2 vCPU / 4 GB cloud instance at Hetzner after the 2026 price rises, sources disagree and the cheap lines were repeatedly unavailable ([agentdeals](https://agentdeals.dev/hetzner-pricing-2026), [bitdoze](https://www.bitdoze.com/md/hetzner-cloud-cost-optimized-plans.md)); a 4 GB secondary holding a growing dataset needs more RAM later |
| **C. Managed (MongoDB Atlas)** with continuous backup | seconds | minutes | an approved price and a region choice | an M10 is listed from about USD 0.08/h on AWS (about USD 58/month before backup and transfer) on [MongoDB's pricing page](https://www.mongodb.com/pricing.md); Atlas region availability near KSA was not confirmed by my search, check in the console. **Not recommended before R19 settles where health data may live.** |

**Recommendation: A now (cheap, no new host), then B when the standby VPS exists (R15), never C unless the owner approves a price and R19 allows the region.** B gives the RPO/RTO the brief asks for; A alone does not.

### Residency warning for B and C
A standby or Atlas cluster holds a full copy of health data. Hetzner's cheap lines are in Germany/Finland (EU), Atlas near KSA is unconfirmed. If R19 requires KSA hosting, the standby must be in KSA too, or it may hold only encrypted backups and no live copy. Decide R19 first or choose the standby provider from the KSA list.

## Why the arbiter and the two phases (what the tasks enforce)
A replica set with **2 voting members is worse than 1**: lose either and there is no primary. So a data member is first added **non-voting** (hidden, priority 0, votes 0), it syncs, and only then the third vote (an arbiter) is added in the **same** reconfig that gives the secondary its vote. With an arbiter MongoDB requires an explicit default write concern; the task sets `w:1` (journaled by default). Consequence to accept knowingly: with primary + secondary + arbiter, **if the secondary is down, writes with `w:majority` cannot be acknowledged**; the code uses the default (w:1) and transactions inherit it, so the app keeps writing, but then the standby is not protecting those writes until it is back. A three-data-member set removes the caveat (needs a third host).
Tasks (not in `tools/ops/RUN`; the lead reviewer schedules them on `review/server-inspect`):
- `tasks/100-mongo-rs-status.sh` - read-only: members, lag, votes, oplog window, connections, age of the newest slice and dump, and the primary's member host.
- `tasks/101-mongo-rs-member.sh` - `PHASE=data` then `PHASE=vote`, dry run first, rollback removes only the two members; refuses shell metacharacters; `vote` refuses until the secondary is SECONDARY with lag <= 30 s. Tested against a fake mongosh (`tools/ops/tests/test_mongo_rs_tasks.py`).
- **Before the first run**: the primary's own member host is probably a Docker alias (`mongodb:27017`) the standby cannot reach: change it in the same change window to the WireGuard address; mongod must listen only on the private link; keep the keyFile (already enabled) and add TLS between members. Nothing of this is applied here.

## Connection pools (done in this PR)
`MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` are now set in compose: api 80/10, worker 40/5. `tools/ops/mongo_pool_budget.py` (CI: `.github/workflows/mongo-pool-budget.yml`, test `test_mongo_pool_budget.py`) checks worst case = sum over clients of (maxPoolSize + 4 monitor connections) x replicas + 50 for tools <= `maxIncomingConnections`, and <= 25 % of the mongodb memory limit in MB. Today: 282 of 300. The fastapi service has no readable Mongo client in this repo, so it is counted at the pymongo default of 100 (unknown, check its image). **With the second API replica (R4) the api pool must be 40 each** (the test proves 80 x 2 does not fit). 134 req/s at ~20 ms of database time per request is about 3 concurrent operations, so 80 is generous; lowering from 200 does not throttle the measured load. Not measured on production: look at `100-mongo-rs-status` "connections: current=" first.

## Read preference for heavy reads
A **hidden member is invisible to normal clients**, so `secondaryPreferred` will not reach it. The design is a second, non-hidden secondary tagged `{use:"analytics"}` or the hidden member reached by a dedicated connection string with `directConnection=true`. That is R17; here: one dedicated connection (a second Mongoose connection with `readPreference=secondary` to the standby's address) is the code change, and it needs the standby first.

## Redis and Meilisearch off the app host
Both are configuration, not code: `REDIS_URL`/`REDIS_CACHE_URL`, the Meilisearch host/key env of the API and worker. Order of value per MB of RAM freed on the app host: Meilisearch (limit 1024m, rebuildable index, search only) first, then Redis (queues and sessions: latency-sensitive, move only to the same private network). Move = run the service on the standby VPS, point the env at the WireGuard address, re-index (Meilisearch) or let queues drain (Redis). Not done here; it needs the second host.

## DR runbook and quarterly drill
`docs/runbooks/disaster-recovery.md` and the monthly `dr-drill.sh` exist and already measure rpo_seconds and rto_seconds. Proposal: keep the monthly drill, change the targets in `.env` only after option B is live (`DR_RPO_TARGET=60`, `DR_RTO_TARGET=900`), and add a quarterly **failover** drill on the standby (promote, point a staging API at it, run the smoke journeys, step back). Writing that drill belongs with R15 (it needs the standby).

## Not done
No standby, no Atlas, no member added, no host changes, no Redis/Meilisearch move, no timing of a real restore (the drill reports it monthly; look at the last `dr_drill` row in the admin page for the real RTO before choosing A).
