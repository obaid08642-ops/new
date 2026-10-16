#!/usr/bin/env bash
# P14.27 ceiling ladder: capacity.js at a constant load per step (SCENARIO=constant), one summary per step, with the CPU of
# the backend and Mongo sampled during each step, then one markdown table (summarize.py).
#   OUT=/tmp/ladder STEPS="10 20 40 80" DURATION=60s FIXTURES=/tmp/k6-fixtures.json bash tools/perf/k6/ladder.sh
# The other capacity.js variables (BASE, ALLOW_WRITES, WEBHOOK_SECRET) are passed through. The ceiling is the last step
# whose thresholds all pass; the steps above it show which request breaks first. CPU sampling only sees processes on
# this machine (the local test stack); against staging read the host metrics instead.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
K6="${K6:-k6}"
OUT="${OUT:-/tmp/k6-ladder}"
STEPS="${STEPS:-10 20 40 80 160}"
mkdir -p "$OUT"
for vus in $STEPS; do
  python3 "$HERE/cpu-sample.py" node mongod > "$OUT/cpu-$vus.txt" &
  sampler=$!
  "$K6" run -q -e SCENARIO=constant -e VUS="$vus" -e DURATION="${DURATION:-60s}" ${FIXTURES:+-e FIXTURES="$FIXTURES"} \
    --summary-export "$OUT/step-$vus.json" "$HERE/capacity.js" > "$OUT/step-$vus.log" 2>&1
  echo "step $vus VUs: k6 exit $?"
  kill "$sampler" 2>/dev/null; wait "$sampler" 2>/dev/null
  sleep "${PAUSE:-10}"   # let queues and caches settle between steps
done
python3 "$HERE/summarize.py" "$OUT" $STEPS
