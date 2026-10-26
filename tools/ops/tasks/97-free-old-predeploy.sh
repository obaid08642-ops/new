#!/bin/bash
# Disk is critical (lead reviewer, 2026-10-26): run 28 found 0.88 GB free on / before cleanup and its deploy aborted (production
# unchanged). Each deploy writes a ~336 MB pre-deploy Mongo dump and each catalogue apply a backup; six runs today filled the disk.
# Owner decision 2026-10-26: keep ONE local copy of each backup kind, free the rest. The nightly backups (nabd_*.gz) are also
# copied off-server to the private R2 bucket by backup.sh (verified by 62-backups-verify), so the newest local nightly stays and the
# older local copies go; pre-deploy dumps and catalogue-apply backups keep only their newest. Prints each removed file (name, size)
# and the disk before/after. Public lines start with "cleanup:".
set -u
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
echo "cleanup: predeploy before: free $(free_gb) GB"
sudo -n du -sh "$B" 2>/dev/null | sed 's/^/cleanup: du /'
for pat in 'pre-deploy-*.gz' 'catalogue-*.json.gz' 'nabd_*.gz' 'pre-antigravity-*.gz'; do
  files=$(sudo -n sh -c "ls -1t $B/$pat 2>/dev/null" | tail -n +2)
  for f in $files; do
    s=$(sudo -n du -sh "$f" 2>/dev/null | cut -f1)
    sudo -n rm -rf -- "$f" && echo "cleanup: removed $(basename "$f") ($s)"
  done
done
sudo -n sh -c "ls -1t $B" 2>/dev/null | head -12 | sed 's/^/cleanup: kept /'
n=0; for f in $(sudo -n find /var/lib/docker/containers -name '*-json.log' -size +20M 2>/dev/null); do sudo -n truncate -s 0 "$f" && n=$((n+1)); done
echo "cleanup: truncated $n container logs over 20 MB"
sudo -n journalctl --vacuum-size=100M >/dev/null 2>&1
echo "cleanup: predeploy after: free $(free_gb) GB"
