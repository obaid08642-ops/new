#!/bin/bash
# Tests deploy/scripts/monitor.sh's disk alert and its e-mail rule with fake df readings (no docker, no network):
# below 20 % free -> one alert mail; same alert again -> no mail until ALERT_REPEAT_HOURS; recovery -> one OK mail;
# no OPS_ALERT_EMAIL -> logged only.
set -u
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
mkdir -p "$W/deploy/scripts" "$W/log" "$W/state"
cp "$ROOT/deploy/scripts/monitor.sh" "$W/deploy/scripts/monitor.sh"
fail=0; n=0
df_line() { printf 'Filesystem 1024-blocks Used Available Capacity Mounted\n/dev/sda1 39845888 %s %s 0%% /\n' $((39845888-$1)) "$1"; }
run() { # avail_k, expected mails added, label, [extra env...]
  local avail=$1 want=$2 label=$3; shift 3
  local before; before=$(grep -c '^SUBJECT:' "$W/mails" 2>/dev/null || true); before=${before:-0}
  env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state" MONITOR_DF_OUTPUT="$(df_line "$avail")" \
      MONITOR_MAIL_CMD="tee -a $W/mails" OPS_ALERT_EMAIL=ops@example.invalid "$@" bash "$W/deploy/scripts/monitor.sh" >/dev/null
  local after; after=$(grep -c '^SUBJECT:' "$W/mails" 2>/dev/null || true); after=${after:-0}
  n=$((n+1))
  if [ $((after-before)) = "$want" ]; then echo "ok $n - $label (mails +$((after-before)))"; else echo "FAIL $n - $label: mails +$((after-before)), wanted +$want"; fail=1; fi
}
run 9961472 0 "25% free: no alert"
run 2097152 1 "2 GB free (5%): one alert mail"
grep -q 'disk / has 5% free (2.0 GB), below 20%' "$W/mails" && echo "ok - mail says 5% free (2.0 GB)" || { echo "FAIL - mail text"; fail=1; }
run 1900000 0 "still low a run later: no repeat before ALERT_REPEAT_HOURS"
run 1900000 1 "still low after the repeat window: one more mail" ALERT_REPEAT_HOURS=0
run 11953766 1 "30% free again: one recovery mail"
grep -q 'all checks OK again' "$W/mails" && echo "ok - recovery mail" || { echo "FAIL - no recovery mail"; fail=1; }
run 11953766 0 "still fine: no more mail"
before=$(grep -c ALERT "$W/log/nabdah-alerts.log")
env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state2" MONITOR_DF_OUTPUT="$(df_line 2097152)" \
    MONITOR_MAIL_CMD="tee -a $W/mails2" bash "$W/deploy/scripts/monitor.sh" >/dev/null
[ ! -s "$W/mails2" ] && [ "$(grep -c ALERT "$W/log/nabdah-alerts.log")" -gt "$before" ] && echo "ok - no OPS_ALERT_EMAIL: logged, no mail" || { echo "FAIL - without OPS_ALERT_EMAIL"; fail=1; }
[ $fail = 0 ] && echo "PASS: monitor disk alert" || exit 1
