#!/bin/bash
# Second disk cleanup (review session, 2026-10-16). 59-free-disk freed only 0.2 GB: / is 38 GB and 100% used, MongoDB is
# down (exit 14 at 07:39 UTC, disk full). Removes only things nothing running needs, each one checked first:
#   1. /opt/temp-swap (1 GB) when it is not an active swap file
#   2. the release tarball /opt/nabdah/releases/*/images.tar.gz (1.2 GB): its images are already loaded in docker
#   3. /home/ubuntu/nabd_pre_cleanup_20260803.archive (0.44 GB, an August dump; nightly backups are on R2)
#   4. the pre-antigravity backup of 2026-10-15 (0.32 GB); the pre-deploy one and the newest nightly stay
#   5. container log files over 20 MB, truncated in place (containers keep running)
#   6. rollback-* images (~3 GB): release ce53c57f has run since 2026-10-15 20:10 UTC
# Then measures what is left: each container's writable layer (docker ps -s) and the biggest directories inside the
# largest one, so a third step can be decided on facts. Never touches a volume or the database files.
# Public lines start with "cleanup:".
set +e
DK="sudo -n docker"
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
sz() { sudo -n du -sb "$1" 2>/dev/null | awk '{printf "%.2f GB", $1/1073741824}'; }
echo "cleanup: step2 before: free $(free_gb) GB"

if [ -f /opt/temp-swap ]; then
  if sudo -n swapon --show=NAME --noheadings | grep -qx /opt/temp-swap; then echo "cleanup: /opt/temp-swap is an active swap, kept"
  else s=$(sz /opt/temp-swap); sudo -n rm -f /opt/temp-swap && echo "cleanup: removed /opt/temp-swap ($s, not an active swap)"; fi
fi
for f in $(sudo -n sh -c 'ls /opt/nabdah/releases/*/images.tar.gz 2>/dev/null'); do
  s=$(sz "$f"); sudo -n rm -f "$f" && echo "cleanup: removed $f ($s; its images are loaded)"
done
f=/home/ubuntu/nabd_pre_cleanup_20260803.archive; [ -f $f ] && { s=$(sz $f); sudo -n rm -f $f && echo "cleanup: removed $f ($s)"; }
for f in $(sudo -n sh -c 'ls /opt/nabdah/backups/pre-antigravity-*.gz 2>/dev/null'); do
  s=$(sz "$f"); sudo -n rm -f "$f" && echo "cleanup: removed $f ($s)"
done
for f in $(sudo -n find /var/lib/docker/containers -name '*-json.log*' -size +20M 2>/dev/null); do
  cid=$(basename "$(dirname "$f")"); name=$($DK inspect -f '{{.Name}}' "$cid" 2>/dev/null | tr -d /)
  s=$(sz "$f"); sudo -n truncate -s 0 "$f" && echo "cleanup: truncated log of ${name:-$cid} ($s)"
done
$DK images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep ':rollback-' | while read ref id; do
  $DK rmi "$ref" >/dev/null 2>&1 && echo "cleanup: removed rollback image $ref"
done
$DK image prune -f >/dev/null 2>&1
echo "cleanup: step2 after: free $(free_gb) GB"

echo "cleanup: container writable layers (size of what each container wrote):"
$DK ps -a -s --format '{{.Names}} {{.Size}}' | sed 's/^/cleanup:   /'
BIG=$($DK ps -s --format '{{.Names}} {{.Size}}' | awk '{v=$2; u=v; gsub(/[0-9.]/,"",u); gsub(/[A-Za-z]/,"",v); m=(u=="GB")?v*1024:(u=="MB")?v:(u=="kB")?v/1024:0; print m, $1}' | sort -rn | head -1 | awk '{print $2}')
if [ -n "$BIG" ]; then
  echo "cleanup: biggest writable layer: $BIG; its largest directories:"
  $DK exec "$BIG" sh -c 'du -x -d 3 / 2>/dev/null | sort -rn | head -15' | awk '{printf "cleanup:   %.2f GB %s\n", $1/1048576, $2}'
fi
echo "cleanup: other candidates (not removed): $(for d in /opt/nabdah/nabdah-backend /opt/nabdah/patient-web /opt/nabdah/Napd-admin /opt/nabdah/import; do printf '%s=%s ' "$d" "$(sz $d)"; done)"
echo "cleanup: mounts of those folders by any container: $($DK ps -aq | xargs -r $DK inspect -f '{{.Name}} {{range .Mounts}}{{.Source}} {{end}}' | grep -E '/opt/nabdah/(nabdah-backend|patient-web|Napd-admin|import)' | tr '\n' ';')"
