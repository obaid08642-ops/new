#!/bin/bash
# Free space on / before the deploy (reviewer, 2026-10-15). The deploy of main@8c8c08ac stopped at its first check with
# "only 2 GB free on /" (it needs 4 GB to load the release and keep a rollback image). The owner allowed removing
# images and anything filling the disk; the data to keep is the database (medicine catalogue, insurance companies,
# service lists), and the deploy takes a full MongoDB backup right after this task.
#
# Measures first (sizes and paths only), then removes only what nothing running needs:
#   1. docker build cache and dangling images
#   2. images no container uses, except rollback-* tags, the release's own images and the base images compose runs
#   3. release folders other than the one being deployed
#   4. container log files over 100 MB (truncated in place; the containers keep running)
#   5. the systemd journal beyond 200 MB, the apt cache
#   6. only if / still has under 6 GB free: nightly backups older than the newest 3 (pre-deploy backups are kept)
# Never touches docker volumes (database, redis, uploads), running containers, the deploy folder or its env file.
# Prints sizes and paths only, never file contents or secret values. Lines start with "cleanup:" (public job log).
set +e
REL=0579c8cc   # the release of the next deploy (main after #1443, #1446, #1447)
DK="sudo -n docker"
B=/opt/nabdah/backups
KEEP_REPOS='^(mongo|redis|nginx|getmeili/meilisearch|livekit/livekit-server|coturn/coturn|nabdah-migrations)$'
free_gb() { df -Pk / | awk 'NR==2{printf "%.1f", $4/1048576}'; }
free_int() { df -Pk / | awk 'NR==2{print int($4/1048576)}'; }
gb() { awk '{printf "%.2f GB", $1/1073741824}'; }

echo "cleanup: before: / $(df -Ph / | awk 'NR==2{print "size "$2", used "$3", free "$4" ("$5" used)"}')"
df -Ph -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null | awk 'NR>1 && $6!="/"{print "cleanup: other mount "$6": size "$2", free "$4}'

for p in /var/lib/docker/overlay2 /var/lib/docker/containers /var/lib/docker/volumes /var/lib/docker/image \
         /opt/nabdah/releases /opt/nabdah/backups /opt/nabdah/deploy /var/log /var/cache /home /root /tmp /snap; do
  sudo -n test -e $p && echo "cleanup: du $p $(sudo -n du -xsb $p 2>/dev/null | awk '{print $1}' | gb)"
done
sudo -n du -xsb /opt/nabdah/* 2>/dev/null | sort -rn | head -8 | while read s p; do echo "cleanup: du $p $(echo $s | gb)"; done
$DK system df 2>/dev/null | sed 's/^/cleanup: docker /'
$DK system df -v 2>/dev/null | sed -n '/Local Volumes space usage/,/Build cache usage/p' | grep -vE '^\s*$|Build cache' | head -20 | sed 's/^/cleanup: volume /'
echo "cleanup: files over 300 MB on /:"
sudo -n find / -xdev -type f -size +300M -printf '%s %p\n' 2>/dev/null | sort -rn | head -20 \
  | while read s p; do echo "cleanup:   $(echo $s | gb) $p"; done
echo "cleanup: backups: $(sudo -n sh -c "ls $B/nabd_*.gz 2>/dev/null | wc -l") nightly, newest $(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1 | xargs -r basename") ($(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1 | xargs -r stat -c %s" | gb))"

# ---- 1. build cache and dangling images
$DK builder prune -af >/dev/null 2>&1
$DK image prune -f >/dev/null 2>&1
echo "cleanup: build cache and dangling images removed; free $(free_gb) GB"

# ---- 2. images no container uses (kept: images of any container, rollback-*, the release, compose base images)
USED=$($DK ps -aq | xargs -r $DK inspect -f '{{.Image}}' 2>/dev/null | sort -u)
$DK images --no-trunc --format '{{.ID}} {{.Repository}} {{.Tag}}' | while read id repo tag; do
  echo "$USED" | grep -qx "$id" && continue
  case "$tag" in rollback-*|$REL|${REL}*) continue;; esac
  echo "$repo" | grep -qE "$KEEP_REPOS" && continue
  sz=$($DK image inspect -f '{{.Size}}' "$id" 2>/dev/null)
  $DK rmi "$repo:$tag" >/dev/null 2>&1 && echo "cleanup: removed image $repo:$tag ($(echo ${sz:-0} | gb))"
done
$DK image prune -f >/dev/null 2>&1
echo "cleanup: unused images removed; free $(free_gb) GB"

# ---- 3. other release folders
for d in $(sudo -n ls /opt/nabdah/releases 2>/dev/null); do
  [ "$d" = "$REL" ] && continue
  sudo -n rm -rf "/opt/nabdah/releases/$d" && echo "cleanup: removed release folder $d"
done

# ---- 4. container logs over 100 MB
for f in $(sudo -n find /var/lib/docker/containers -name '*-json.log' -size +100M 2>/dev/null); do
  cid=$(basename "$(dirname "$f")"); name=$($DK inspect -f '{{.Name}}' "$cid" 2>/dev/null | tr -d /)
  sz=$(sudo -n stat -c %s "$f")
  sudo -n truncate -s 0 "$f" && echo "cleanup: truncated log of ${name:-$cid} ($(echo $sz | gb))"
done

# ---- 5. journal and apt cache
sudo -n journalctl --vacuum-size=200M >/dev/null 2>&1
sudo -n apt-get clean >/dev/null 2>&1
echo "cleanup: journal and apt cache trimmed; free $(free_gb) GB"

# ---- 6. old nightly backups, only if still short of space
if [ "$(free_int)" -lt 6 ]; then
  for f in $(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | tail -n +4"); do
    sz=$(sudo -n stat -c %s "$f")
    sudo -n rm -f "$f" && echo "cleanup: removed old nightly backup $(basename "$f") ($(echo $sz | gb))"
  done
fi

echo "cleanup: after: / $(df -Ph / | awk 'NR==2{print "size "$2", used "$3", free "$4" ("$5" used)"}')"
[ "$(free_int)" -ge 4 ] && echo "cleanup: OK, enough room for the deploy" || echo "cleanup: STILL SHORT, under 4 GB free; the deploy will stop at its pre-check"
