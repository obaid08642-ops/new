#!/bin/bash
# Safe disk cleanup before a deploy (lead reviewer, 2026-10-25): run 20 aborted with 8 GB free, 9 needed. Owner rules: never a volume,
# never a backup, never a running or rollback image, only dangling images and build cache older than 72h. This task frees only:
#   1. systemd journal above 200 MB (journalctl --vacuum-size)
#   2. the apt package cache (apt-get clean)
#   3. container log files over 20 MB, truncated in place (containers keep running)
#   4. dangling images and build cache older than 72h (the same rule as 60-deploy-main)
# Then prints the largest directories under / so any further step is decided on facts. Public lines start with "cleanup:".
set +e
DK="sudo -n docker"
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
echo "cleanup: safe before: free $(free_gb) GB"
sudo -n journalctl --vacuum-size=200M >/dev/null 2>&1; echo "cleanup: journal vacuumed, free $(free_gb) GB"
sudo -n apt-get clean >/dev/null 2>&1; echo "cleanup: apt cache cleaned, free $(free_gb) GB"
n=0; for f in $(sudo -n find /var/lib/docker/containers -name '*-json.log' -size +20M 2>/dev/null); do sudo -n truncate -s 0 "$f" && n=$((n+1)); done
echo "cleanup: truncated $n container logs over 20 MB, free $(free_gb) GB"
$DK image prune -f --filter "until=72h" >/dev/null 2>&1; $DK builder prune -f --filter "until=72h" >/dev/null 2>&1
echo "cleanup: dangling images and old build cache pruned, free $(free_gb) GB"
$DK system df 2>&1 | sed 's/^/cleanup: docker /'
sudo -n du -xh --max-depth=2 / 2>/dev/null | sort -rh | head -15 | sed 's/^/cleanup: du /'
sudo -n du -sh /opt/nabdah/releases/* /opt/nabdah/backups 2>/dev/null | sed 's/^/cleanup: du /'
echo "cleanup: safe after: free $(free_gb) GB"
