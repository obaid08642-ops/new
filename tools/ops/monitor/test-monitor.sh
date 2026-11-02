#!/bin/bash
# Tests deploy/scripts/monitor.sh with fake df readings, fake container stats and stand-in mail providers (no docker,
# no real network): warn < 20 % free and critical < 10 % or < 5 GB; the disk-FILLING alert (hours left at the recent
# rate); container layer / log-rotation / log-size alerts; the e-mail rule (new set of alerts, repeat window, recovery);
# the daily summary mail; and the provider fallback Resend -> Brevo -> Mailjet.
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
      MONITOR_SUMMARY_HOUR=99 MONITOR_MAIL_CMD="tee -a $W/mails" OPS_ALERT_EMAIL=ops@example.invalid "$@" bash "$W/deploy/scripts/monitor.sh" >/dev/null
  local after; after=$(grep -c '^SUBJECT:' "$W/mails" 2>/dev/null || true); after=${after:-0}
  n=$((n+1))
  if [ $((after-before)) = "$want" ]; then echo "ok $n - $label (mails +$((after-before)))"; else echo "FAIL $n - $label: mails +$((after-before)), wanted +$want"; fail=1; fi
}
run 9961472 0 "25% free: no alert"
run 2097152 1 "2 GB free (5%): one alert mail"
grep -q 'disk / has 5% free (2.0 GB), CRITICAL: below 10% or 5 GB' "$W/mails" && echo "ok - mail says 5% free (2.0 GB), critical" || { echo "FAIL - mail text"; fail=1; }
run 1900000 0 "still low a run later: no repeat before ALERT_REPEAT_HOURS"
run 1900000 1 "still low after the repeat window: one more mail" ALERT_REPEAT_HOURS=0
run 11953766 1 "30% free again: one recovery mail"
grep -q 'all checks OK again' "$W/mails" && echo "ok - recovery mail" || { echo "FAIL - no recovery mail"; fail=1; }
run 11953766 0 "still fine: no more mail"
before=$(grep -c ALERT "$W/log/nabdah-alerts.log")
env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state2" MONITOR_DF_OUTPUT="$(df_line 2097152)" \
    MONITOR_MAIL_CMD="tee -a $W/mails2" bash "$W/deploy/scripts/monitor.sh" >/dev/null
[ ! -s "$W/mails2" ] && [ "$(grep -c ALERT "$W/log/nabdah-alerts.log")" -gt "$before" ] && echo "ok - no OPS_ALERT_EMAIL: logged, no mail" || { echo "FAIL - without OPS_ALERT_EMAIL"; fail=1; }

# ── warn vs critical ──
run 6000000 1 "15% free: warn-level alert"   MONITOR_STATE_DIR="$W/state-w"
grep -q 'disk / has 15% free (5.7 GB), below 20%' "$W/mails" && echo "ok - warn text" || { echo "FAIL - warn text"; fail=1; }
run 4194304 1 "4 GB free (10.5%): critical by the 5 GB rule" MONITOR_STATE_DIR="$W/state-c"
grep -q 'disk / has 10% free (4.0 GB), CRITICAL' "$W/mails" && echo "ok - critical by absolute free space" || { echo "FAIL - critical text"; fail=1; }

# ── disk filling: samples over time (MONITOR_NOW_EPOCH), 12 GB free then 10 GB 6 h later = 340 MB/h, ~30 h left ──
T=1800000000; FILL_SEEN=0
fill() { # label want avail_k now [extra env]
  local label=$1 want=$2 avail=$3 now=$4; shift 4
  env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-f" MONITOR_DF_OUTPUT="$(df_line "$avail")" MONITOR_NOW_EPOCH=$now \
      MONITOR_SUMMARY_HOUR=99 MONITOR_MAIL_CMD="tee -a $W/mails-f" OPS_ALERT_EMAIL=ops@example.invalid "$@" bash "$W/deploy/scripts/monitor.sh" >/dev/null
  n=$((n+1)); local got; got=$(grep -c '^SUBJECT:.*filling at' "$W/mails-f" 2>/dev/null || true); got=${got:-0}
  local d=$((got - FILL_SEEN)); FILL_SEEN=$got
  if [ "$d" = "$want" ]; then echo "ok $n - $label"; else echo "FAIL $n - $label: fill mails +$d, wanted +$want"; fail=1; fi
}
fill "start: 12 GB free, one sample only: no fill alert" 0 12582912 $T
fill "1 h later, 11.9 GB: the only older sample is under 2 h old: no alert" 0 12480000 $((T + 3600))
fill "6 h later, 10 GB free: filling at ~340 MB/h, ~30 h left: alert" 1 10485760 $((T + 21600))
grep -q 'disk / is filling at 3[0-9][0-9] MB/h: full in about 3[0-9] h' "$W/mails-f" && echo "ok - fill text" || { echo "FAIL - fill text"; cat "$W/mails-f"; fail=1; }
rm -rf "$W/state-f" "$W/mails-f"; FILL_SEEN=0
fill "slow loss (100 MB in 6 h): no alert" 0 12480000 $((T + 21600)) 
fill "baseline for slow loss" 0 12582912 $T
fill "slow loss, 6 h later" 0 12480512 $((T + 21600))

# ── containers: layer, log rotation, log size (docker is faked) ──
cstats() { # label want "stats"
  local label=$1 want=$2 stats=$3; shift 3
  rm -f "$W/mails-c"
  env MONITOR_SKIP_SERVICES=1 MONITOR_CONTAINER_STATS="$stats" MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-k$n" MONITOR_DF_OUTPUT="$(df_line 11953766)" \
      MONITOR_SUMMARY_HOUR=99 MONITOR_MAIL_CMD="tee -a $W/mails-c" OPS_ALERT_EMAIL=ops@example.invalid bash "$W/deploy/scripts/monitor.sh" >/dev/null
  n=$((n+1)); local got; got=$(grep -c "$want" "$W/mails-c" 2>/dev/null || true)
  if [ "${got:-0}" -ge 1 ]; then echo "ok $n - $label"; else echo "FAIL $n - $label (no mail with: $want)"; cat "$W/mails-c" 2>/dev/null; fail=1; fi
}
cstats "a container that wrote 5.8 GB into its layer" 'container nabdah-patient-web has written 5.6 GB into its own layer' "nabdah-patient-web|6000000000|20m|1000"
cstats "a container without log rotation" 'container nabdah-coturn has no log rotation' "nabdah-coturn|1000||1000"
cstats "a 200 MB log" 'container nabdah-mongodb has a 200 MB log' "nabdah-mongodb|1000|20m|209715200"
cnone() { # label "stats": no mail at all
  rm -f "$W/mails-c"
  env MONITOR_SKIP_SERVICES=1 MONITOR_CONTAINER_STATS="$2" MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-n$n" MONITOR_DF_OUTPUT="$(df_line 11953766)" \
      MONITOR_SUMMARY_HOUR=99 MONITOR_MAIL_CMD="tee -a $W/mails-c" OPS_ALERT_EMAIL=ops@example.invalid bash "$W/deploy/scripts/monitor.sh" >/dev/null
  n=$((n+1)); if [ ! -s "$W/mails-c" ]; then echo "ok $n - $1"; else echo "FAIL $n - $1"; cat "$W/mails-c"; fail=1; fi
}
cnone "healthy containers raise nothing" "nabdah-nginx|50000000|20m|5000000"
cnone "containers not ours are ignored" "other-thing|9000000000||999999999"

# ── daily summary: once a day from SUMMARY_HOUR, with or without alerts ──
DAY0=$(date -u -d "2027-01-15 07:30:00" +%s); DAY0_EARLY=$(date -u -d "2027-01-15 05:30:00" +%s); DAY1=$(date -u -d "2027-01-16 07:30:00" +%s)
summary() { # label want now
  local label=$1 want=$2 now=$3
  local before; before=$(grep -c '^SUBJECT:.*daily summary' "$W/mails-s" 2>/dev/null || true); before=${before:-0}
  env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-s" MONITOR_DF_OUTPUT="$(df_line 11953766)" MONITOR_NOW_EPOCH=$now \
      MONITOR_MAIL_CMD="tee -a $W/mails-s" OPS_ALERT_EMAIL=ops@example.invalid bash "$W/deploy/scripts/monitor.sh" >/dev/null
  n=$((n+1)); local after; after=$(grep -c '^SUBJECT:.*daily summary' "$W/mails-s" 2>/dev/null || true); after=${after:-0}
  if [ $((after-before)) = "$want" ]; then echo "ok $n - $label"; else echo "FAIL $n - $label: summaries +$((after-before)), wanted +$want"; fail=1; fi
}
summary "05:30 UTC: too early, no summary" 0 $DAY0_EARLY
summary "07:30 UTC, nothing wrong: one summary" 1 $DAY0
summary "08:30 UTC same day: no second summary" 0 $((DAY0 + 3600))
summary "next day 07:30: one more" 1 $DAY1
grep -q 'disk /: [0-9]*% free (11.4 GB)' "$W/mails-s" && echo "ok - summary text" || { echo "FAIL - summary text"; cat "$W/mails-s"; fail=1; }

# ── mail providers: Resend fails -> Brevo; both fail -> Mailjet; only configured providers are tried ──
cat > "$W/stub.py" <<'PY'
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
LOG = sys.argv[2]
CODES = {"/resend": int(sys.argv[3]), "/brevo": int(sys.argv[4]), "/mailjet": int(sys.argv[5])}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0); body = self.rfile.read(n).decode()
        open(LOG, "a").write(json.dumps({"path": self.path, "auth": self.headers.get("Authorization", ""), "apikey": self.headers.get("api-key", ""), "body": body}) + "\n")
        self.send_response(CODES.get(self.path, 404)); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"{}")
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
mailtest() { # label port resend brevo mailjet "expected paths in order" [extra env]
  local label=$1 port=$2; local r=$3 b=$4 m=$5 want=$6; shift 6
  rm -f "$W/req.log" "$W/state-m"/* "$W/log/nabdah-alerts.log"; mkdir -p "$W/state-m"
  python3 "$W/stub.py" "$port" "$W/req.log" "$r" "$b" "$m" & local pid=$!; sleep 0.7
  env MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-m" MONITOR_DF_OUTPUT="$(df_line 2097152)" MONITOR_SUMMARY_HOUR=99 \
      MONITOR_RESEND_URL=http://127.0.0.1:$port/resend MONITOR_BREVO_URL=http://127.0.0.1:$port/brevo MONITOR_MAILJET_URL=http://127.0.0.1:$port/mailjet \
      OPS_ALERT_EMAIL=ops@example.invalid MAIL_FROM='Nabd Plus <no-reply@nabd.plus>' RESEND_API_KEY=re_test BREVO_API_KEY=xkeysib-test MAILJET_API_KEY=mjpub MAILJET_SECRET_KEY=mjsec "$@" \
      bash "$W/deploy/scripts/monitor.sh" >/dev/null
  kill $pid 2>/dev/null; wait $pid 2>/dev/null
  n=$((n+1)); local got; got=$(python3 -c "import json;print(','.join(json.loads(l)['path'] for l in open('$W/req.log')))" 2>/dev/null)
  if [ "$got" = "$want" ]; then echo "ok $n - $label (tried: ${got:-none})"; else echo "FAIL $n - $label: tried '${got}', wanted '$want'"; fail=1; fi
}
mailtest "Resend accepts: only Resend is called" 18931 202 201 200 "/resend"
mailtest "Resend fails (500), Brevo accepts" 18932 500 201 200 "/resend,/brevo"
grep -q 'alert mail failed via resend (HTTP 500)' "$W/log/nabdah-alerts.log" && echo "ok - the failure is logged with the provider and code" || { echo "FAIL - failure not logged"; fail=1; }
mailtest "Resend and Brevo fail: Mailjet is called" 18933 500 400 200 "/resend,/brevo,/mailjet"
mailtest "all three fail" 18934 500 500 500 "/resend,/brevo,/mailjet"
mailtest "no Resend key: starts at Brevo" 18935 202 201 200 "/brevo" RESEND_API_KEY=
python3 - "$W/req.log" <<'PY' && echo "ok - Brevo gets the sender parsed from MAIL_FROM, api-key header, text content" || { echo "FAIL - Brevo payload"; fail=1; }
import json, sys
r = json.loads(open(sys.argv[1]).readline())
b = json.loads(r["body"])
assert r["apikey"] == "xkeysib-test", r
assert b["sender"] == {"email": "no-reply@nabd.plus", "name": "Nabd Plus"}, b
assert b["to"] == [{"email": "ops@example.invalid"}] and "textContent" in b and b["subject"].startswith("[nabd.plus]"), b
PY
# MONITOR_TEST_MAIL=1: one mail, only "sent" / "failed" printed, no alert state written
T=$(env MONITOR_TEST_MAIL=1 MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-t" MONITOR_MAIL_CMD="tee -a $W/mails-testmail" OPS_ALERT_EMAIL=ops@example.invalid MAIL_FROM=x@y.invalid bash "$W/deploy/scripts/monitor.sh" 2>&1 | tail -1)
[ "$T" = "status: monitor-testmail: sent" ] && grep -q '^SUBJECT: \[nabd.plus\] test mail' "$W/mails-testmail" && [ ! -f "$W/state-t/last-signature" ] && echo "ok - test mail: sent, no alert state written" || { echo "FAIL - test mail sent ($T)"; fail=1; }
T=$(env MONITOR_TEST_MAIL=1 MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-t" OPS_ALERT_EMAIL= bash "$W/deploy/scripts/monitor.sh" 2>&1)
case "$T" in "status: monitor-testmail: failed (OPS_ALERT_EMAIL is not set)") echo "ok - test mail: failed when no address is set";; *) echo "FAIL - test mail without address ($T)"; fail=1;; esac
T=$(env -u RESEND_API_KEY -u BREVO_API_KEY -u MAILJET_API_KEY -u MAILJET_SECRET_KEY MONITOR_TEST_MAIL=1 MONITOR_SKIP_SERVICES=1 MONITOR_LOG_DIR="$W/log" MONITOR_STATE_DIR="$W/state-t" OPS_ALERT_EMAIL=ops@example.invalid MAIL_FROM=x@y.invalid bash "$W/deploy/scripts/monitor.sh" 2>&1)
case "$T" in "status: monitor-testmail: failed (see"*) echo "ok - test mail: failed when no provider key is set";; *) echo "FAIL - test mail without key ($T)"; fail=1;; esac
[ $fail = 0 ] && echo "PASS: monitor disk alert" || exit 1
