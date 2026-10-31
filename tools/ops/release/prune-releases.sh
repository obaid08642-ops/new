#!/bin/bash
# Keep only the current and the previous uploaded release dir. Called by the release upload after it has written the new
# $REL_ROOT/<sha8>/ (and by 97d-old-checkouts.sh). Prints the dirs it keeps and removes. Without APPLY=yes it only prints.
#   REL_ROOT  (default /opt/nabdah/releases)   KEEP (default 2)
# A release dir is a directory that holds deploy.tgz; anything else in REL_ROOT is not touched. Newest first by modification time.
# A dir changed in the last 5 minutes is never removed (an upload may be writing it).
set -u
REL_ROOT=${REL_ROOT:-${OPS_RELEASE_DIR:-/opt/nabdah/releases}}
KEEP=${KEEP:-2}
SUDO=${SUDO:-"sudo -n"}
n=0; gone=0; bytes=0
for d in $($SUDO ls -1t "$REL_ROOT" 2>/dev/null); do
  p="$REL_ROOT/$d"
  $SUDO test -d "$p" && ! $SUDO test -L "$p" && $SUDO test -f "$p/deploy.tgz" || continue
  n=$((n+1))
  if [ "$n" -le "$KEEP" ]; then echo "release: keep $p"; continue; fi
  age=$(( ( $(date +%s) - $($SUDO stat -c %Y "$p" 2>/dev/null || date +%s) ) / 60 ))
  if [ "$age" -lt 5 ]; then echo "release: keep $p (changed $age min ago)"; continue; fi
  size=$($SUDO du -sk "$p" 2>/dev/null | cut -f1); bytes=$((bytes + ${size:-0} * 1024))
  if [ "${APPLY:-}" = yes ]; then $SUDO rm -rf -- "$p" && { echo "release: removed $p"; gone=$((gone+1)); }; else echo "release: would remove $p"; gone=$((gone+1)); fi
done
echo "release: $n release dir(s), kept $((n-gone)), $([ "${APPLY:-}" = yes ] && echo removed || echo 'would remove') $gone, $(( (bytes + 524288) / 1048576 )) MB"
