#!/usr/bin/env bash
# P14.22 per-node call capacity with LiveKit's load tester (lk load-test, livekit-cli), one step per number of
# concurrent consultations. A 1:1 consultation = one room with 2 video publishers (720p, simulcast, the apps' setting)
# and 1 subscriber taking both tracks: the same forwarding work as two people watching each other.
#   LK=lk LIVEKIT_URL=http://127.0.0.1:7880 STEPS="10 25 50 100" DURATION=45s bash tools/perf/livekit/ladder.sh
# Uses --dev credentials unless LIVEKIT_API_KEY/SECRET are set. Prints one markdown row per step: calls, LiveKit CPU
# (avg/max % of one core, sampled from /proc when the server runs on this machine), subscriber bitrate, packet loss,
# tracks received. The testers run on the same machine unless LK runs elsewhere: the numbers are then a lower bound.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LK="${LK:-lk}"
URL="${LIVEKIT_URL:-http://127.0.0.1:7880}"
OUT="${OUT:-/tmp/lk-ladder}"
AUTH=(--dev); [ -n "${LIVEKIT_API_KEY:-}" ] && AUTH=(--api-key "$LIVEKIT_API_KEY" --api-secret "$LIVEKIT_API_SECRET")
mkdir -p "$OUT"
echo "| concurrent calls | LiveKit CPU avg / max % | subscriber bitrate (total) | packet loss | tracks received |"
echo "|---|---|---|---|---|"
for n in ${STEPS:-10 25 50 100}; do
  python3 "$HERE/../k6/cpu-sample.py" livekit-server > "$OUT/cpu-$n.txt" &
  sampler=$!
  for i in $(seq 1 "$n"); do
    "$LK" load-test "${AUTH[@]}" --url "$URL" --room "cap-$n-$i" --video-publishers 2 --subscribers 1 \
      --video-resolution high --num-per-second 2 --duration "${DURATION:-45s}" > "$OUT/room-$n-$i.txt" 2>&1 &
  done
  wait $(jobs -p | grep -v "^$sampler$") 2>/dev/null
  kill "$sampler" 2>/dev/null; wait "$sampler" 2>/dev/null
  python3 - "$OUT" "$n" <<'PY'
import glob, re, sys
out, n = sys.argv[1], sys.argv[2]
rate = loss = pk = 0.0; got = want = 0
unit = {'bps': 1e-6, 'kbps': 1e-3, 'mbps': 1.0, 'gbps': 1e3}
for f in glob.glob(f"{out}/room-{n}-*.txt"):
    t = open(f, errors='replace').read()
    m = re.search(r"│ Total\s+│ (\d+)/(\d+)\s+│ ([\d.]+)([kmg]?bps)[^│]*│ (\d+) \(([\d.]+)%\)", t)
    if m:
        got += int(m[1]); want += int(m[2]); rate += float(m[3]) * unit[m[4]]; loss += int(m[5])
        pk += sum(int(x) for x in re.findall(r"│ video │ (\d+)", t))
    else:
        want += 2
cpu = [list(map(int, l.split())) for l in open(f"{out}/cpu-{n}.txt") if l.strip()]
c = f"{round(sum(r[0] for r in cpu) / len(cpu))} / {max(r[0] for r in cpu)}" if cpu else "-"
pct = f"{100 * loss / (pk + loss):.2f}%" if pk + loss else "-"
print(f"| {n} | {c} | {rate:.1f} Mbps | {pct} | {got}/{want} |")
PY
  sleep 5
done
