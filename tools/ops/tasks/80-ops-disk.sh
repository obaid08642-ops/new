#!/bin/bash
# Disk check and prune (owner, 2026-10-22). Read first; prune only when / is above 80% used.
# Prune = unused images (docker image prune -a) and the build cache (docker builder prune).
# Volumes are never touched (no docker volume commands here). Prints short "cleanup:" status lines.
set +e
DK="sudo -n docker"
echo "## ops-disk"
used() { df -P / | awk 'NR==2{gsub("%","",$5); print $5}'; }
echo "cleanup: disk before: $(df -Ph / | awk 'NR==2{print "used "$5", free "$4}')"
$DK system df 2>&1 | sed 's/^/cleanup: docker /'
if [ "$(used)" -gt 80 ]; then
  echo "cleanup: above 80% used; pruning unused images and the build cache (volumes are not touched)"
  $DK image prune -a -f >/dev/null 2>&1; echo "cleanup: image prune -a exit=$?"
  $DK builder prune -f >/dev/null 2>&1; echo "cleanup: builder prune exit=$?"
else
  echo "cleanup: $(used)% used; no prune needed"
fi
echo "cleanup: disk after: $(df -Ph / | awk 'NR==2{print "used "$5", free "$4}')"
$DK system df 2>&1 | sed 's/^/cleanup: docker after: /'
echo "## ops-disk done"
