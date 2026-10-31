#!/bin/bash
# READ-ONLY progress of a detached 98-translate-content run (run 38 outlived the workflow's 120-min poll).
# Prints counts only: is the task still running, how many answers the container and the host hold, and the task's own status: lines.
# Also prints the run's own stats file ($W-in-container /tmp/translate-work/stats.json, written every 30 s by `translate-product-content run`):
# per provider sent, ok, 429 (limited), errors, answers that failed the checks, error classes, parked_until, retired; overall answered, remaining,
# last_answer_at. Only WHITELISTED fields are printed, error classes only as fixed words (http_429, timeout, ...): never an error message,
# a prompt or a key (a provider's error text once carried a key). Sends nothing to a model and writes nothing.
set -u
CT=${CATALOGUE_CONTAINER:-nabdah-worker}   # the translation run is background work: it runs in the worker container, so its memory is the worker's and never the API's (2026-10-30 OOM)
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
W=${OPS_TRANSLATE_DIR:-$IN/translate-work}
DK="sudo -n docker"
say() { echo "status: translate-progress: $*"; }
LOG="$HOME/ops-98-translate-content.log"
if [ -f "$LOG" ]; then
  if grep -q '^ops-exit=' "$LOG"; then say "task finished: $(grep -m1 '^ops-exit=' "$LOG")"; else say "task still running"; fi
  grep -E '^status: translate-content' "$LOG" | tail -n 6 | cut -c1-500 | sed 's/^status: /status: translate-progress: log: /'
else
  say "no detached log found"
fi
REQ_C=$($DK exec "$CT" sh -c 'wc -l < /tmp/translate-work/requests.jsonl' 2>/dev/null || echo none)
RES_C=$($DK exec "$CT" sh -c 'wc -l < /tmp/translate-work/responses.jsonl' 2>/dev/null || echo none)
REQ_H=$(sudo -n sh -c "wc -l < '$W/requests.jsonl'" 2>/dev/null || echo none)
RES_H=$(sudo -n sh -c "wc -l < '$W/responses.jsonl'" 2>/dev/null || echo none)
say "container: requests=$REQ_C answers=$RES_C | host: requests=$REQ_H answers=$RES_H"

# the runner's stats file (counts only), through a whitelist
STATS=$($DK exec "$CT" sh -c 'cat /tmp/translate-work/stats.json' 2>/dev/null || true)
[ -n "$STATS" ] || STATS=$(sudo -n cat "$W/stats.json" 2>/dev/null || true)   # 97 copies it to the host before it removes the container's work directory
if [ -z "$STATS" ]; then
  say "stats: no stats file yet (the run in this container predates it, or has not written one)"
else
  printf '%s' "$STATS" | python3 -I -c '
import json, re, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("status: translate-progress: stats: unreadable"); sys.exit(0)
word = re.compile(r"^[a-z0-9_]{1,40}$")
def n(v): return v if isinstance(v, int) and not isinstance(v, bool) else 0
def ts(v): return v if isinstance(v, str) and re.match(r"^\d{4}-\d\d-\d\dT[\d:.]+Z$", v) else "-"
def say(t): print("status: translate-progress: stats: " + t)
say("at=%s started=%s answered_this_run=%d remaining_this_run=%d failed=%d last_answer_at=%s | all: answered=%d of %d, remaining=%d" % (
    ts(d.get("at")), ts(d.get("started_at")), n(d.get("answered")), n(d.get("remaining")), n(d.get("failed")), ts(d.get("last_answer_at")),
    n(d.get("answered_total")), n(d.get("requests_total")), n(d.get("remaining_total"))))
for name, p in sorted((d.get("providers") or {}).items()):
    if not word.match(str(name)) or not isinstance(p, dict): continue
    ec = p.get("error_classes") if isinstance(p.get("error_classes"), dict) else {}
    classes = " ".join("%s=%d" % (k, n(v)) for k, v in sorted(ec.items()) if word.match(str(k)))
    ret = "yes" if p.get("retired") else "no"
    say("%s: sent=%d ok=%d limited=%d errors=%d rejected=%d avg_ms=%d parked_until=%s retired=%s classes=[%s]" % (
        name, n(p.get("sent")), n(p.get("ok")), n(p.get("limited")), n(p.get("errors")), n(p.get("rejected")), n(p.get("avg_latency_ms")), ts(p.get("parked_until")), ret, classes))
    if p.get("retired"):
        why = str(p.get("retired"))
        known = {"key rejected", "daily budget used", "limited again and again (daily limit presumed)", "its answers keep failing the checks"}
        ok = why in known or re.match(r"^refused by the provider \(http_4\d\d\)$", why)
        say("%s: retired because: %s" % (name, why if ok else "(text not shown)"))
'
fi
exit 0
