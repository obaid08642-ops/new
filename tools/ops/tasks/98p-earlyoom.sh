#!/bin/bash
# R1 (2026-11-02: the 3.8 GB host hung, no SSH, Cloudflare 522 for hours): a user-space OOM killer that acts BEFORE the kernel thrashes, a swapfile guard, and sshd protected from the OOM killer.
#   Dry run (default): READ-ONLY. Prints earlyoom (installed / enabled / active), its args, swap total, sshd's OOMScoreAdjust and what APPLY=yes would do. Changes nothing.
#   APPLY=yes: (1) apt-get install earlyoom if missing, (2) writes $ETC/default/earlyoom: kill at MemAvailable < 5% AND swap free < 10%, never mongod/redis/sshd/dockerd, prefer clamd/meilisearch,
#              (3) enables + starts it, (4) swapfile guard: if swap total < SWAP_MIN_MB (default 2048) creates $SWAPFILE (SWAP_MB, default 2048) and adds it to fstab; existing swap is never touched,
#              (5) systemd drop-in for ssh/sshd: OOMScoreAdjust=-1000.
#   ROLLBACK=yes: stops + disables earlyoom, removes its args file and the ssh drop-in. The swapfile and the package stay (removing swap under load is the risky direction).
set -u
APPLY=""
ROLLBACK=""
ETC=${OPS_ETC:-/etc}
PROC=${OPS_PROC:-/proc}
SWAPFILE=${OPS_SWAPFILE:-/swapfile}
SWAP_MIN_MB=${SWAP_MIN_MB:-2048}
SWAP_MB=${SWAP_MB:-2048}
DEF=$ETC/default/earlyoom
SSH_UNIT=${OPS_SSH_UNIT:-$(systemctl list-unit-files ssh.service 2>/dev/null | grep -q "^ssh.service" && echo ssh || echo sshd)}
DROPIN_DIR=$ETC/systemd/system/$SSH_UNIT.service.d
DROPIN=$DROPIN_DIR/nabd-oom.conf
ARGS='-m 5 -s 10 -r 3600 --avoid "(^|/)(mongod|redis-server|sshd|dockerd|containerd|systemd|earlyoom)$" --prefer "(^|/)(clamd|meilisearch|node)$"'
echo "## earlyoom"
say() { echo "status: earlyoom: $*"; }
mi() { awk -v k="$1:" '$1 == k {print $2}' "$PROC/meminfo" 2>/dev/null; }

if [ "$ROLLBACK" = yes ]; then
  sudo -n systemctl disable --now earlyoom >/dev/null 2>&1
  sudo -n rm -f "$DEF" "$DROPIN"; sudo -n systemctl daemon-reload >/dev/null 2>&1
  say "rolled back: earlyoom stopped and disabled, $DEF and $DROPIN removed (package and swapfile kept)"; exit 0
fi

HAVE=no; command -v earlyoom >/dev/null 2>&1 && HAVE=yes
EN=$(sudo -n systemctl is-enabled earlyoom 2>/dev/null || echo no); ACT=$(sudo -n systemctl is-active earlyoom 2>/dev/null || echo no)
CONF=no; sudo -n test -f "$DEF" && CONF=yes
SWT=$(( $(mi SwapTotal) / 1024 )); MT=$(( $(mi MemTotal) / 1024 ))
SWAP_OK=yes; [ "$SWT" -ge "$SWAP_MIN_MB" ] || SWAP_OK=no
DROP=no; sudo -n test -f "$DROPIN" && DROP=yes
say "host: MemTotal ${MT} MB, SwapTotal ${SWT} MB (guard minimum ${SWAP_MIN_MB} MB: $SWAP_OK)"
say "earlyoom: installed $HAVE, enabled $EN, active $ACT, args file $CONF; $SSH_UNIT drop-in OOMScoreAdjust=-1000: $DROP"
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was changed. APPLY=yes would: install earlyoom if missing; write $DEF with: $ARGS; enable it; create ${SWAP_MB} MB $SWAPFILE if swap < ${SWAP_MIN_MB} MB; write $DROPIN"
  exit 0
fi

if [ "$HAVE" != yes ]; then
  sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y earlyoom >/dev/null 2>&1 || { say "ABORT apt-get install earlyoom failed; nothing else changed"; exit 1; }
fi
sudo -n mkdir -p "$ETC/default" || { say "ABORT cannot create $ETC/default"; exit 1; }
printf '%s\n' "# written by tools/ops/tasks/98p-earlyoom.sh" "EARLYOOM_ARGS='$ARGS'" | sudo -n tee "$DEF" >/dev/null || { say "ABORT cannot write $DEF"; exit 1; }
sudo -n systemctl enable --now earlyoom >/dev/null 2>&1 || { say "ABORT cannot enable earlyoom"; exit 1; }
sudo -n systemctl restart earlyoom >/dev/null 2>&1

if [ "$SWAP_OK" != yes ]; then
  if sudo -n test -e "$SWAPFILE"; then say "swap is below ${SWAP_MIN_MB} MB but $SWAPFILE already exists: not touched (check with swapon --show)"
  else
    sudo -n fallocate -l "${SWAP_MB}M" "$SWAPFILE" && sudo -n chmod 600 "$SWAPFILE" && sudo -n mkswap "$SWAPFILE" >/dev/null && sudo -n swapon "$SWAPFILE" \
      || { say "ABORT swapfile creation failed (earlyoom is already active)"; exit 1; }
    sudo -n grep -qs "^$SWAPFILE " "$ETC/fstab" || printf '%s none swap sw 0 0\n' "$SWAPFILE" | sudo -n tee -a "$ETC/fstab" >/dev/null
    say "created and enabled ${SWAP_MB} MB $SWAPFILE"
  fi
else
  say "swap is ${SWT} MB: guard satisfied, nothing created"
fi

sudo -n mkdir -p "$DROPIN_DIR" && printf '%s\n' "# written by tools/ops/tasks/98p-earlyoom.sh" "[Service]" "OOMScoreAdjust=-1000" | sudo -n tee "$DROPIN" >/dev/null \
  || { say "ABORT cannot write $DROPIN"; exit 1; }
sudo -n systemctl daemon-reload >/dev/null 2>&1
say "applied: earlyoom active ($(sudo -n systemctl is-active earlyoom 2>/dev/null || echo ?)); $SSH_UNIT drop-in written (takes effect at the next ssh restart; running sessions are not cut). Check: systemctl status earlyoom"
