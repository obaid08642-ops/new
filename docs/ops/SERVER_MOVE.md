# Moving the production server (RAM upgrade, another host, another region)

Status: **plan, nothing here has been run.** Written 2026-10-31 for the owner's decision: upgrade the OVH RAM, or move to another host or region, possibly in the Gulf. It is based on what the repository says about how production runs (files named in each row); numbers marked *estimate* are not measured and the plan says how to measure them.

## 1. Which move is it?

| | A. Upgrade RAM in place | B. New server, same provider and region | C. New server in another provider or region (the Gulf) |
|---|---|---|---|
| What changes | nothing but RAM (provider resizes, usually a reboot) | the IP | the IP, the provider, the latency, possibly the law that applies |
| Data to move | none | MongoDB, redis queues, certs, env, volumes | the same, plus a decision on the R2 buckets (section 7) |
| Downtime | the reboot plus the containers starting: estimate **5 to 15 min**, no data copy | write freeze **10 to 25 min** with the method below (reads can stay up) | the same, plus DNS and TLS lead time |
| Zero data loss | yes: take a fresh dump first | yes with section 4 | yes with section 4 |
| Risk | lowest | medium | highest (cloud firewalls, residency, new network paths for calls) |

Recommendation: **A first if the provider can resize in place**: it is the only option that needs no data copy, and the memory budget (`docs/ops/MEMORY_BUDGET.md`) gets room at once. Do B or C only for a reason RAM does not fix (region, latency, provider). Everything below is B or C; for A only sections 2 (the backup before), 5 (checks after) and 8 (re-budget) apply.

## 2. What runs where today (the facts the plan depends on)

| Thing | Where | Source |
|---|---|---|
| App tree | `/opt/nabdah/{deploy,backups,releases}`; containers `nabdah-*` | `deploy/setup-server.sh`, `tools/ops/tasks/*` |
| Services | mongodb (replica set `rs0`, auth + keyFile, WiredTiger cache 0.6 GB), redis (queues, rate limits), redis-cache, meilisearch, backend, worker, fastapi, admin-web, patient-web, nginx, livekit, coturn (host network), clamav, certbot | `deploy/docker-compose.production.yml`, `deploy/mongo/mongod.conf` |
| Named volumes | `mongo_data`, `redis_data`, `clamav_db`, `meili_data`, `nginx_cache` | the compose file |
| Secrets and config | `/opt/nabdah/deploy/.env.production` (mode 600), `deploy/certs/` (Let's Encrypt), the rendered coturn config | `deploy/scripts/render-coturn-config.sh`, `issue-certs.sh` |
| Uploads, CDN, backups | Cloudflare R2 (off the server): uploaded files, `cdn.nabd.plus`, the encrypted dumps and oplog slices | `deploy/DNS-RECORDS.md`, `deploy/scripts/backup.sh`, `oplog-backup.sh` |
| Backups and drill | nightly encrypted dump + oplog slices every 10 min to the bucket; `dr-drill.sh` restores from the bucket alone and prints `rpo_seconds` and `rto_seconds` | `docs/runbooks/disaster-recovery.md` |
| DNS | `api`, `admin`, `provider`, `live` (A, TTL 300), `turn` (DNS only, not proxied), the root; Cloudflare in front of the HTTP hosts; `origin-lockdown.sh` lets only Cloudflare reach 80/443 | `deploy/DNS-RECORDS.md`, `deploy/scripts/origin-lockdown.sh` |
| Calls | LiveKit media goes **straight to the server's IP** (7881/tcp, 7882/udp mux, no `node_ip`, address found by STUN); coturn needs `external-ip` and 3478, 5349, 40000-49999/udp; Cloudflare TURN (70b) is the second path | `tools/ops/tasks/93-calls-network.sh`, `deploy/coturn/turnserver.conf` |
| Deploy access | GitHub environment `production` secrets `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` | `.github/workflows/server-inspect.yml`, `deploy-remote.sh` |
| Write freeze | emergency maintenance: every non-admin write gets 503 `emergency_maintenance`; admin, sign-in, config and the **payment and call webhooks stay open** | `backend/src/modules/kill-switches/emergency-maintenance.middleware.ts` |

## 3. Everything that carries the old address (check list)

- DNS A records: `api`, `admin`, `provider`, `live`, `turn`, the root; and the Cloudflare origin of the proxied hosts.
- coturn `external-ip` (both families) and the LiveKit advertised address (automatic: STUN, no `node_ip`; `93-calls-network.sh` fixes both on the new host).
- Provider firewall or cloud security group **in front of the server** (new on most clouds; OVH has its own too): 22, 80, 443, 3478 tcp+udp, 5349/tcp, 7881/tcp, 7882/udp, 40000-49999/udp. `ufw` is created by `setup-server.sh`, but a cloud firewall is separate and is the usual reason calls fail after a move. Check with `93b-calls-ports.sh` and `net-probe.py` (PR #2248).
- `origin-lockdown.sh` (the Cloudflare allow-list in `DOCKER-USER`): run it on the new host; it is not carried by the data.
- GitHub secrets `DEPLOY_HOST` / `DEPLOY_PORT` / `DEPLOY_USER` / `DEPLOY_SSH_KEY`, and the new host's key (`ssh-keyscan` in the workflow picks it up).
- Third parties that allow-list **our outgoing IP** or check it: payment gateway webhook and API allow-lists, the mail provider (SPF, reverse DNS of the sending address), any firewall of a partner. **Not found in the repo, so it must be asked**: list them before the date.
- TLS certificates (section 6) and `turn.nabd.plus`'s own copy under `deploy/certs/turn`.
- The cron entries (`deploy/cron/nabd-backups`): backups, oplog slices, drills, monitors. `setup-server.sh` does not mention installing them, so check how they are installed on the old host (`crontab -l`, `/etc/cron.d`) and do the same on the **new** host; they must stop on the old one (section 4, step 9).

## 4. The move with zero data loss (method 1: restore early, replay the oplog, switch)

This uses the tools that already exist for disaster recovery (`restore-drill.sh`, `dr-drill.sh`, `oplog-backup.sh`, the bucket): the new server is built and loaded **while the old one keeps serving**, then a short write freeze closes the gap.

**T minus 7 days**
1. Choose the host and region (section 7 if the Gulf). Order it with at least the RAM of `MEMORY_BUDGET.md`'s plan plus the headroom the owner wants; same OS family as the old one.
2. Lower the TTL of the DNS records to 60 s (they are 300 s). Cloudflare-proxied hosts switch at the edge at once when the origin changes; `live` and `turn` are DNS only and depend on the TTL.
3. Run a restore **rehearsal on the new host**: `deploy/setup-server.sh` (Docker, ufw, fail2ban, swap, sysctl), the same directory layout under `/opt/nabdah`, then `dr-drill.sh` there. Its report gives the measured `rto_seconds` for the real data size: **that number replaces the estimates in section 9**.

**T minus 1 day**
4. Copy `/opt/nabdah/deploy/.env.production` and `deploy/certs/` (the whole `live`, `archive`, `renewal` and `turn` trees) to the new host over an encrypted channel, mode 600. Never through the repository or a log. Copy the replica-set keyFile `/opt/nabdah/deploy/mongo/mongo-keyfile` (the compose file mounts it read-only as `/etc/mongo-keyfile`; its content must be identical or the replica set will not form).
5. Bring the stack up on the new host **with the workers and the API stopped** (databases, redis, meilisearch, nginx only), restore the newest nightly dump from the bucket, and replay the oplog slices that follow it (the same code `dr-drill.sh` uses with `DR_TARGET_TIME`). Meilisearch can be copied (`meili_data`, same version) or rebuilt from the database (minutes). `clamav_db` can be copied or re-downloaded by freshclam (uploads are refused until it is ready).

**The window (the cut-over, 10 to 25 min of write freeze, estimate)**
6. Turn **emergency maintenance on** in the admin (reads keep working, non-admin writes get 503). Stop the **worker** on the old server so no consumer writes. Webhooks and admin are exempt from the freeze, so also check that the oplog stops growing (`oplog-backup.sh` reports the slice size; two empty slices in a row = quiet).
7. Let redis drain its queues (BullMQ, for example `notifications-delivery`: waiting and active counts as `backend/src/modules/observability/queue-backlog.ts` reads them, see `docs/runbooks/notifications-queue.md`; the worker is stopped, so wait until nothing is waiting or accept re-queueing), then copy `redis_data` (`redis-cli SAVE`, then the volume) or start redis empty if the owner accepts losing queued jobs: **decide beforehand which**.
8. Take the **final oplog slice** on the old server and replay it on the new one; compare the document count per collection of the application database between old and new (the drill's check does this for the restored copy; run it as `mongosh` counts on both). Start backend, worker, patient-web, admin-web, fastapi, livekit, coturn on the new host; `health-check.sh`; `93-calls-network.sh` (dry run, then apply) and `93b-calls-ports.sh`; `70b-turn-env.sh` is not needed again (the env came across).
9. **Switch DNS** (origin of the proxied hosts, then `live`, `turn`, the root). Change the GitHub secrets `DEPLOY_*`. Run `origin-lockdown.sh` on the new host. Turn emergency maintenance **off**. On the **old** server: stop its cron jobs (backups, oplog slices, drills, monitors) **and the containers**, so nothing writes to the shared bucket or to the old database.
10. Watch: webhooks that were retried by providers to the new address, `net-probe.py` from outside, one real call (audio and video), one payment in test mode, the admin dashboard, Sentry.

**After**
11. **Start a new backup chain at once**: a full nightly-style dump on the new host and a fresh oplog series. The new replica set has its own oplog timeline; the drill takes "the newest dump and the unbroken chain that follows it", so a clean start keeps it valid. Run `dr-drill.sh` against the new chain the next day and check `rpo_seconds` / `rto_seconds`.
12. Keep the old server **powered off but not deleted for 7 days**. Rollback within the first hour is possible only while the new server has taken no writes that matter; after that the way back is forward (fix on the new host), because the old one does not have the new writes. State this to the owner in advance.

Method 2 (add the new server as a replica-set member over a private tunnel, let it sync, then step down) gives a shorter freeze but needs mongod reachable between the two hosts (a WireGuard tunnel, the keyFile on both, firewall rules) and a change to the replica set configuration on production: more moving parts, so it is the second choice. Method 3 (a plain dump, restore, no oplog) is the fallback and a longer write freeze: dump time plus transfer plus restore plus verify.

## 5. Checks after the cut-over (all read-only)

`health-check.sh`; `98-memory-report.sh` (limits, use, the `oom_score_adj` of mongod: it must be -900 on the process); `93b-calls-ports.sh` and `net-probe.py`; `96-mongodump-check.sh`; TLS: every host answers with a valid certificate (`openssl s_client`), including `turn.nabd.plus` on 5349; a call between two phones on different networks (the relay-only check is `.github/workflows/turn-relay.yml`); payment webhook delivery; push notifications; the search index count against the database; `dr-drill.sh` next day.

## 6. TLS

The HTTP hosts use Let's Encrypt certificates issued by `issue-certs.sh` (HTTP-01 on port 80). On the new host the DNS does not point there yet, so a new HTTP-01 issue **fails until the cut-over** and would leave nginx without certificates in the window. Two ways, in order of preference: (a) copy the existing `certs/` trees (step 4) so nginx starts with valid certificates and the renewals keep working; (b) issue with DNS-01 through the Cloudflare API token (the repository already holds `CLOUDFLARE_API_TOKEN`). Cloudflare "Full (strict)" needs a valid origin certificate in both cases. `turn.nabd.plus` is not proxied and coturn reads its own copy under `certs/turn`: copy it too.

## 7. If the move is to the Gulf: questions that are not technical

- **Data residency.** Patient health data and uploads are personal data; the owner must ask counsel what applies to **where the server and the buckets are** (the Saudi personal data protection law and the rules of the health authorities on transfer outside the Kingdom). I did not verify any of this; it can decide the region before the engineering does.
- **The R2 buckets are not on the server.** Moving the server does **not** move uploads, the CDN origin or the backups; those sit in Cloudflare R2. If residency matters, the buckets move too: a separate migration (copy objects, change the endpoint and keys in the env, re-point `cdn.nabd.plus`, and the lifecycle rules of the backup bucket), larger than the server move itself. Do not promise "everything in the Kingdom" without it.
- **Latency.** The gain is for users in the Gulf (API round trips, call setup); Cloudflare already serves static content near them.
- **Provider facts to check before choosing** (I did not verify availability, price or network): an in-country region exists and can be bought; inbound UDP 7882, 3478 and 40000-49999 is allowed in its firewall; a public IPv4 (and IPv6) per server; the CPU and RAM sizes; backups and snapshots; the ability to run Docker with host networking for coturn.
- **Staff access and contracts:** SSH keys, the provider account owner, billing in SAR or USD.

## 8. Changes to the ops tasks and the tests

- **Nothing in the tasks needs to change if the new host uses the same layout** (`/opt/nabdah/...`, `nabdah-*` container names): `setup-server.sh` already builds it, and the tasks read paths from `OPS_*` variables with those defaults. The reason to keep the layout is exactly that.
- `98c-swapfile.sh` (PR #2226): `setup-server.sh` already creates a 4 GB `/swapfile`. On a new host the swap task is not needed; the task already refuses a file of another size, so it will say so.
- **Re-budget the memory** if the RAM changes: `docs/ops/MEMORY_BUDGET.md` and the constants in `deploy/scripts/test_compose_memory.py` (`HOST_MB`, `OS_RESERVE_MB`) and `tools/ops/tests/test_memory_budget.py` (`MEMTOTAL_MB`, `HOST_OWN_MB`); then raise the limits in the compose file on purpose. With 8 GB the 40 MB margin of today's budget becomes about 4 GB of room: that is the real argument for A.
- `93-calls-network.sh` finds the public IPv4 itself (ipify); run its dry run on the new host before applying.
- `server-inspect.yml`: only the four `DEPLOY_*` secrets change.
- `origin-lockdown.sh`: run it on the new host (it is not part of `setup-server.sh`).
- Cron: install the entries of `deploy/cron/nabd-backups` on the new host the way the old host has them; remove them from the old one (step 9).
- **New tasks to write if the owner decides to move** (not built here): `99a-move-preflight.sh` (read-only on the old server: database size, oplog window, volume sizes, certificates present, cron entries, disk, firewall, DNS TTLs) and `99b-move-verify.sh` (per-collection document counts on old and new, sent through the same `status:` lines). Both are small and read-only.

## 9. Downtime, honestly

| Part | Method 1 estimate | How to measure |
|---|---|---|
| Write freeze to switched DNS | **10 to 25 min** (drain worker 1-3, final oplog slice and replay 2-5, counts and start 3-5, DNS and checks 3-10) | rehearse steps 6-9 on the new host with `dr-drill.sh`: its `rto_seconds` is the restore part |
| Reads | stay up until the DNS switches; the apps show the maintenance screen for writes | |
| Calls in progress | dropped at the switch; clients reconnect | schedule at the lowest-traffic hour |
| DNS caching | proxied hosts: seconds; `live`, `turn`: up to the TTL (60 s after step 2) | |
| Method 3 (plain dump) | freeze = dump + transfer + restore + verify: scales with the data size | `ls -l /opt/nabdah/backups` for the dump size; the drill for the restore speed |
| Option A (RAM in place) | **5 to 15 min** (provider reboot, then containers start and pass health checks) | ask the provider; time a manual `docker compose restart` of the stack for the second half |

I could not measure the data size or the restore time from here (no production access); the drill on the new host produces both, and the plan should not be scheduled before that number is read.
