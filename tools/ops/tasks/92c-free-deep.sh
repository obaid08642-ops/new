#!/bin/bash
# Deeper disk cleanup + a full breakdown of what fills the disk (owner, 2026-10-28: "delete the images and the backups, free the space,
# and tell me what this data is"). Safe by construction:
#   - the running release (its images, containers, files) and every docker VOLUME (the database, redis, search) are never touched;
#   - releases: keeps the running one and the newest other one (the rollback target); older release folders are removed;
#   - rollback image tags: keeps the newest set; older rollback tags are removed (an image goes only when nothing uses it);
#   - local database backups: keeps the NEWEST one of each kind (owner: one local copy; the nightlies are on R2), removes the rest;
#   - docker build cache, journal over 100 MB, apt cache.
# Prints names and sizes only ("cleanup:" lines).
set +e
DK="sudo -n docker"
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
say() { echo "cleanup: $*"; }
say "deep: before: $(df -Ph / | awk 'NR==2{print "size "$2", used "$3" ("$5"), free "$4}')"
say "deep: memory: $(free -m | awk '/Mem:/{print "total "$2" MB, used "$3" MB, available "$7" MB"}'); swap: $(free -m | awk '/Swap:/{print $2" MB"}')"
# what fills the disk, top level (one filesystem)
sudo -n du -xh --max-depth=1 / 2>/dev/null | sort -rh | head -12 | sed 's/^/cleanup: deep: du \/ /'
sudo -n du -xh --max-depth=1 /var/lib/docker /opt/nabdah /var/log 2>/dev/null | sort -rh | head -16 | sed 's/^/cleanup: deep: du /'
$DK system df 2>&1 | sed 's/^/cleanup: deep: docker /'
# running release sha (from the backend image tag)
RUN=$($DK inspect -f '{{.Config.Image}}' nabdah-backend 2>/dev/null | sed 's/.*://' | cut -c1-8)
say "deep: running release ${RUN:-unknown}"
# 1) release folders: keep the running one and the newest other one
if [ -n "$RUN" ] && [ -d /opt/nabdah/releases ]; then
  KEEP_OTHER=$(ls -1t /opt/nabdah/releases 2>/dev/null | grep -v "^$RUN" | head -1)
  for d in $(ls -1t /opt/nabdah/releases 2>/dev/null); do
    case "$d" in "$RUN"*|"$KEEP_OTHER") say "deep: kept release $d";; *) s=$(sudo -n du -sh "/opt/nabdah/releases/$d" | cut -f1); sudo -n rm -rf "/opt/nabdah/releases/$d" && say "deep: removed release $d ($s)";; esac
  done
fi
# 2) rollback image tags: keep the newest timestamp set
NEWEST=$($DK images --format '{{.Tag}}' | grep '^rollback-' | sort -r | head -1)
for ref in $($DK images --format '{{.Repository}}:{{.Tag}}' | grep ':rollback-'); do
  case "$ref" in *":$NEWEST") say "deep: kept $ref";; *) $DK rmi "$ref" >/dev/null 2>&1 && say "deep: removed tag $ref" || say "deep: kept $ref (in use)";; esac
done
# images no container uses (old releases) after the tags are gone
USED=$($DK ps -aq | xargs -r $DK inspect -f '{{.Image}}' | sort -u)
for id in $($DK images -q --no-trunc | sort -u); do
  echo "$USED" | grep -qx "$id" && continue
  tags=$($DK image inspect -f '{{range .RepoTags}}{{.}} {{end}}' "$id" 2>/dev/null)
  case "$tags" in *":$NEWEST"*) continue;; esac
  $DK rmi "$id" >/dev/null 2>&1 && say "deep: removed unused image ${tags:-<none>}"
done
$DK builder prune -a -f >/dev/null 2>&1 && say "deep: build cache pruned"
$DK image prune -f >/dev/null 2>&1
# 3) local backups: newest one of each kind
for dir in /opt/nabdah/backups /opt/nabdah/backups/pre-deploy; do
  [ -d "$dir" ] || continue
  for pat in 'pre-deploy-*.gz' 'catalogue-*.json.gz' 'nabd_*.gz.gpg' 'nabd_*.gz' 'pre-antigravity-*.gz' 'deploy-files-pre-*.tgz'; do
    sudo -n sh -c "ls -1t $dir/$pat 2>/dev/null" | tail -n +2 | while read -r f; do
      s=$(sudo -n du -sh "$f" | cut -f1); sudo -n rm -f "$f" "$f.oplogts" && say "deep: removed backup $(basename "$f") ($s)"
    done
  done
done
sudo -n journalctl --vacuum-size=100M >/dev/null 2>&1 && say "deep: journal vacuumed to 100 MB"
sudo -n apt-get clean >/dev/null 2>&1
say "deep: after: $(df -Ph / | awk 'NR==2{print "used "$3" ("$5"), free "$4}') (free $(free_gb) GB)"
