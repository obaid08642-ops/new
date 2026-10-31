#!/bin/bash
# A 2 GB swap file on the host (run 69: the host is out of memory, SwapTotal 0, the kernel killed mongod 15 times and meilisearch 11 times in 3 hours). Two runs of the same task.
#   (APPLY empty)  DRY RUN: checks the disk room, the file system and what swap exists, and prints every step it would take; nothing is changed.
#   APPLY=yes      (set in this file by the reviewer, after reading the dry run): creates the file, turns it on, makes it permanent (/etc/fstab) and sets vm.swappiness=10.
#   REMOVE=yes     (alone, set in this file): the way back: swapoff, the fstab line, the sysctl file and the swap file itself.
# Guards (the task stops before changing anything when one fails): the file system of the swap file must support swap files (ext4 or xfs, not btrfs/zfs/tmpfs/overlay), the file
# must not exist with another size, and the free space after the file must stay at least OPS_SWAP_MIN_FREE_AFTER_MB (default 1536 MB). Disk use is 87% now: run 97d-old-checkouts first.
# MongoDB (and redis) stay OFF swap by their own `memswap_limit` = `mem_limit` in docker-compose.production.yml: a swapped-out mongod is slower than a restart. This task never changes a
# container; it reports whether nabdah-mongodb is off swap. The other containers get an explicit, small swap allowance in the compose file (docs/ops/MEMORY_BUDGET.md).
# Prints `status:` lines only.
set -u
APPLY=""
REMOVE=""
SWAPFILE=${OPS_SWAPFILE:-/swapfile}
SIZE_MB=${OPS_SWAP_MB:-2048}
SWAPPINESS=${OPS_SWAPPINESS:-10}
MIN_FREE_AFTER_MB=${OPS_SWAP_MIN_FREE_AFTER_MB:-1536}
FSTAB=${OPS_FSTAB:-/etc/fstab}
SYSCTL_FILE=${OPS_SYSCTL_FILE:-/etc/sysctl.d/99-nabd-swap.conf}
PROC=${OPS_PROC:-/proc}
DK="sudo -n docker"
SUDO="sudo -n"
echo "## swapfile"
say() { echo "status: swapfile: $*"; }
mi() { awk -v k="$1:" '$1 == k {print $2}' "$PROC/meminfo" 2>/dev/null; }
DIR=$(dirname "$SWAPFILE")
$SUDO test -d "$DIR" || { say "ABORT $DIR does not exist"; exit 1; }
say "mode: $([ "$REMOVE" = yes ] && echo REMOVE || { [ "$APPLY" = yes ] && echo APPLY || echo 'dry run (nothing is changed)'; }); file $SWAPFILE, ${SIZE_MB} MB, vm.swappiness $SWAPPINESS"
active() { $SUDO swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAPFILE"; }
SWT=$(( $(mi SwapTotal) / 1024 )); SWF=$(( $(mi SwapFree) / 1024 ))
say "now: SwapTotal ${SWT} MB, SwapFree ${SWF} MB, vm.swappiness $(cat "$PROC/sys/vm/swappiness" 2>/dev/null || echo ?), MemAvailable $(( $(mi MemAvailable) / 1024 )) MB"

mongo_report() {
  local m s
  m=$($DK inspect -f '{{.HostConfig.Memory}}' nabdah-mongodb 2>/dev/null); s=$($DK inspect -f '{{.HostConfig.MemorySwap}}' nabdah-mongodb 2>/dev/null)
  if [ -z "$m" ]; then say "nabdah-mongodb: not found, swap setting not checked"
  elif [ "$m" = "$s" ]; then say "nabdah-mongodb: memory $((m / 1048576)) MB = memory+swap $((s / 1048576)) MB: it is OFF swap"
  else say "WARNING nabdah-mongodb may use swap (memory $((m / 1048576)) MB, memory+swap $((s / 1048576)) MB): set memswap_limit equal to mem_limit in the compose file"; fi
}

if [ "$REMOVE" = yes ]; then
  if [ "$APPLY" = yes ]; then say "ABORT set only one of APPLY and REMOVE"; exit 1; fi
  active && { $SUDO swapoff "$SWAPFILE" && say "swapoff $SWAPFILE done" || { say "ABORT swapoff failed (the pages could not be moved back to RAM): nothing else was changed"; exit 1; }; }
  if $SUDO grep -qE "^[[:space:]]*$SWAPFILE[[:space:]]" "$FSTAB" 2>/dev/null; then
    $SUDO cp -p "$FSTAB" "$FSTAB.bak-$(date -u +%Y%m%d%H%M%S)"; $SUDO sed -i "\\|^[[:space:]]*$SWAPFILE[[:space:]]|d" "$FSTAB"; say "fstab line removed (the old file is kept as $FSTAB.bak-*)"
  fi
  $SUDO rm -f "$SYSCTL_FILE" "$SWAPFILE"; say "removed $SYSCTL_FILE and $SWAPFILE; vm.swappiness stays as it is until the next boot"
  say "REMOVED: SwapTotal now $(( $(mi SwapTotal) / 1024 )) MB"
  exit 0
fi

FS=${OPS_FSTYPE:-$($SUDO stat -f -c %T "$DIR" 2>/dev/null)}   # OPS_FSTYPE: for the tests
case "$FS" in ext2/ext3|ext4|ext*|xfs) ;; *) say "ABORT the file system of $DIR is '$FS': a swap file needs ext4 or xfs"; exit 1;; esac
if $SUDO test -e "$SWAPFILE"; then
  have=$(( $($SUDO stat -c %s "$SWAPFILE") / 1048576 ))
  if [ "$have" != "$SIZE_MB" ]; then say "ABORT $SWAPFILE exists with ${have} MB, not ${SIZE_MB} MB: remove it first (REMOVE=yes) or change OPS_SWAP_MB"; exit 1; fi
  say "$SWAPFILE exists (${have} MB), $(active && echo 'already active' || echo 'not active')"
fi
read -r TOT FREE <<< "$(df -Pm "$DIR" 2>/dev/null | awk 'NR == 2 {print $2, $4}')"
NEED=$SIZE_MB; $SUDO test -e "$SWAPFILE" && NEED=0
AFTER=$(( FREE - NEED ))
USEPCT_AFTER=$(( ( (TOT - FREE + NEED) * 100 + TOT / 2 ) / TOT ))
say "disk: ${FREE} MB free of ${TOT} MB; after the file ${AFTER} MB free (disk use about ${USEPCT_AFTER}%); needs at least ${MIN_FREE_AFTER_MB} MB free after"
if [ "$AFTER" -lt "$MIN_FREE_AFTER_MB" ]; then say "ABORT not enough room: ${AFTER} MB would be left, ${MIN_FREE_AFTER_MB} MB are required. Free space first (97d-old-checkouts, 97c-retention), then run this again"; exit 1; fi
say "plan: $($SUDO test -e "$SWAPFILE" || echo "create $SWAPFILE (${SIZE_MB} MB, fallocate, mode 600, mkswap); ")$(active && echo '' || echo "swapon; ")fstab line '$SWAPFILE none swap sw 0 0' (the old fstab is saved first); $SYSCTL_FILE with vm.swappiness=$SWAPPINESS and sysctl -w"
mongo_report
if [ "$APPLY" != yes ]; then say "dry run only: nothing was changed. To apply, set APPLY=yes in this task (after the review of the lines above)"; exit 0; fi

created=""
if ! $SUDO test -e "$SWAPFILE"; then
  if ! $SUDO fallocate -l "${SIZE_MB}M" "$SWAPFILE" 2>/dev/null; then
    say "fallocate failed, writing the file with dd (slower)"; $SUDO dd if=/dev/zero of="$SWAPFILE" bs=1M count="$SIZE_MB" status=none || { $SUDO rm -f "$SWAPFILE"; say "ABORT dd failed: nothing was kept"; exit 1; }
  fi
  created=yes
  $SUDO chmod 600 "$SWAPFILE"
  $SUDO mkswap -L nabd-swap "$SWAPFILE" >/dev/null || { $SUDO rm -f "$SWAPFILE"; say "ABORT mkswap failed: the file was removed"; exit 1; }
  say "created $SWAPFILE (${SIZE_MB} MB, mode 600)"
fi
if ! active; then
  $SUDO swapon "$SWAPFILE" || { [ -n "$created" ] && $SUDO rm -f "$SWAPFILE"; say "ABORT swapon failed$([ -n "$created" ] && echo ': the file was removed')"; exit 1; }
fi
if ! $SUDO grep -qE "^[[:space:]]*$SWAPFILE[[:space:]]" "$FSTAB" 2>/dev/null; then
  $SUDO cp -p "$FSTAB" "$FSTAB.bak-$(date -u +%Y%m%d%H%M%S)"; echo "$SWAPFILE none swap sw 0 0" | $SUDO tee -a "$FSTAB" >/dev/null; say "fstab line added (the old file is kept as $FSTAB.bak-*)"
else say "fstab already has the line"; fi
printf '# written by tools/ops/tasks/98c-swapfile.sh: use swap only under real pressure (the databases are off swap by their own memswap_limit)\nvm.swappiness=%s\n' "$SWAPPINESS" | $SUDO tee "$SYSCTL_FILE" >/dev/null
$SUDO sysctl -w "vm.swappiness=$SWAPPINESS" >/dev/null 2>&1 || echo "$SWAPPINESS" | $SUDO tee "$PROC/sys/vm/swappiness" >/dev/null

# the proof
OK=yes
active || { OK=no; say "CHECK FAILED $SWAPFILE is not active"; }
NOW=$(( $(mi SwapTotal) / 1024 )); [ "$NOW" -ge $(( SIZE_MB * 95 / 100 )) ] || { OK=no; say "CHECK FAILED SwapTotal is ${NOW} MB, expected about ${SIZE_MB} MB"; }
SW=$(cat "$PROC/sys/vm/swappiness" 2>/dev/null); [ "$SW" = "$SWAPPINESS" ] || { OK=no; say "CHECK FAILED vm.swappiness is '$SW'"; }
$SUDO grep -qE "^[[:space:]]*$SWAPFILE[[:space:]]" "$FSTAB" || { OK=no; say "CHECK FAILED no fstab line"; }
[ "$(stat -c %a "$SWAPFILE" 2>/dev/null || $SUDO stat -c %a "$SWAPFILE")" = 600 ] || { OK=no; say "CHECK FAILED the swap file is not mode 600"; }
say "APPLIED: SwapTotal ${NOW} MB, SwapFree $(( $(mi SwapFree) / 1024 )) MB, vm.swappiness $SW, permanent through fstab and $SYSCTL_FILE; checks $([ $OK = yes ] && echo passed || echo 'FAILED, see above')"
[ $OK = yes ]
