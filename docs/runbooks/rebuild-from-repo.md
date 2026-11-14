# Rebuild production from the repo and the last backup (R15b)

Goal: a new server serves nabd.plus again in **30 minutes or less** from "the old one is gone". Every phase has a budget (`deploy/scripts/rebuild-budget.tsv`, sums to 29 minutes) and `deploy/scripts/rebuild-timer.sh` times them and says which one ate the time.

**Measured status: NOT measured end to end yet.** The phases that use existing scripts have been rehearsed separately (`dr-drill.sh` restores from the bucket alone and reports its own seconds; `ops-rehearsal.yml` runs the compose stack on a CI runner). A full rebuild on a real, throwaway server has not been timed; do it with the timer below and put the printed table in the PR that changes this document. The budget numbers are estimates, not results. The phase most likely to blow the budget is **images**: the compose file builds backend/patient-web/admin on the host (minutes each); the release overlay (`docker-compose.release.yml`, used by `rolling-deploy.sh`) pulls prebuilt images and is the only way to fit 7 minutes.

## What you need before the disaster (check quarterly)
1. **The secrets file** `.env.production` (mode 600) in the owner's secret store, NOT only on the server: it holds the database, Redis, JWT, backup and provider keys. `deploy.sh` generates a fresh one when none exists, which makes the old backups unreadable (the encryption passphrase is separate: `BACKUP_ENCRYPTION_PASSPHRASE_FILE`, section "Passphrase" of `disaster-recovery.md`). Without both, stop: this is the one thing no script can recover.
2. The bucket credentials (`BACKUP_S3_*`), the Cloudflare token for DNS, the provider account (OVH or Hetzner) with a VPS of at least the size in `docs/ops/MEMORY_BUDGET.md`, the deploy SSH key.
3. Prebuilt images for the release (registry or the release overlay) so the images phase is a pull.

## Phases (the timer wraps each)
```
source deploy/scripts/rebuild-timer.sh
phase_manual provision-and-ssh 150                       # time from "order" to first SSH, from your clock
phase setup-server      sudo bash deploy/setup-server.sh # Docker, ufw, fail2ban, swap, sysctl (idempotent)
phase repo-env-certs    bash -c 'git clone <repo> /opt/nabdah/src && install -m600 <env> /opt/nabdah/deploy/.env.production && bash deploy/scripts/issue-certs.sh'
phase images            bash -c 'docker compose -f deploy/docker-compose.production.yml -f deploy/docker-compose.release.yml pull'
phase restore-database  bash -c '<docs/runbooks/disaster-recovery.md steps 3-6: up mongodb, rs.initiate, restore dump, replay oplog>'
phase start-and-indexes bash deploy/scripts/deploy.sh    # up, indexes, health
phase_manual dns-and-edge 100                            # A records / Cloudflare origin, origin-lockdown.sh, TURN external-ip (SERVER_MOVE.md section 3)
phase smoke             bash deploy/health-check.sh
rebuild_report
```
The restore itself is exactly `docs/runbooks/disaster-recovery.md` (Restore, steps 1-8); the address-bearing settings to change on a new IP are the check list in `docs/ops/SERVER_MOVE.md` section 3 (DNS, coturn `external-ip`, LiveKit address, provider firewall ports, `origin-lockdown.sh`, GitHub deploy secrets, partners that allow-list our IP).

## What shortens it
- A hot standby (R7 option B) removes the restore phase: promote the secondary, point the app at it.
- DNS TTL 60 s on `live`/`turn` in advance (SERVER_MOVE.md); Cloudflare-proxied hosts switch at the edge at once.
- A golden image of the provider VPS after `setup-server.sh` (snapshot) removes the setup phase (5 min) at the cost of keeping it patched.

## Drill
Once a quarter on a throwaway VPS (delete it after): run the phases with the timer, file the table. A rebuild that has not been timed in the last 90 days is a hope, not a plan.
