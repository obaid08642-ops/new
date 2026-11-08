#!/usr/bin/env bash
# Start a local LiveKit media server for the live journeys (decision 4 of 2026-10-14: a real call on our own LiveKit).
#   bash tools/live/start-livekit.sh            (logs: /tmp/livekit.log; idempotent: does nothing when it already answers)
# Runs the pinned livekit-server release in dev mode (API key "devkey", secret "secret") on 127.0.0.1:$LIVEKIT_PORT
# (7880 by default; WebRTC on TCP $LIVEKIT_PORT+1 and UDP $LIVEKIT_PORT+2). start-backend.sh points the backend at it
# (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET) and start-web.sh points the website's call screen at it.
# The binary is downloaded once into a cache directory outside the repository and checked against its sha256.
#   LIVEKIT_CACHE_DIR  cache directory (default: ${XDG_CACHE_HOME:-~/.cache}/nabd-livekit/<version>)
#   LIVEKIT_TARBALL    use this already-downloaded release tarball instead of downloading (checked the same way)
set -euo pipefail
VERSION="1.10.1"
SHA256="${LIVEKIT_SHA256:-e0305fb755667cbbcc352c3be12f8eff8da3a8a843b4fc711b5151e284f545f9}"   # livekit_1.10.1_linux_amd64.tar.gz (LIVEKIT_SHA256 only for the test of the download retry)
# 1.10 serves the /rtc/v1 signal path that livekit-client 2.22 uses by default (one peer connection). 1.8.4 answered
# 404 there: the client fell back to the old path and then re-connected every ~15 s ("unsupported datachannel").
URL="https://github.com/livekit/livekit/releases/download/v${VERSION}/livekit_${VERSION}_linux_amd64.tar.gz"
PORT="${LIVEKIT_PORT:-7880}"
LOG="${LIVEKIT_LOG:-/tmp/livekit.log}"
CACHE="${LIVEKIT_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/nabd-livekit/$VERSION}"
BIN="$CACHE/livekit-server"

answers() { [[ "$(curl -s --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null)" == "OK" ]]; }

if answers; then echo "livekit up (already running on :$PORT)"; exit 0; fi

if [[ "$(uname -s)-$(uname -m)" != "Linux-x86_64" ]]; then
  echo "start-livekit.sh: the pinned release is linux amd64; on $(uname -s)-$(uname -m) install livekit-server $VERSION and set LIVEKIT_CACHE_DIR to its folder" >&2
  [[ -x "$BIN" ]] || exit 1
fi

if [[ ! -x "$BIN" ]]; then
  mkdir -p "$CACHE"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  tarball="${LIVEKIT_TARBALL:-}"
  if [[ -z "$tarball" ]]; then
    tarball="$tmp/livekit.tgz"
    # GitHub's release CDN answers 504/502 now and then (live gate, 2026-11-08: four 504 in a row in under 10 s, so curl's own --retry 3 was too short).
    # Retry the whole download with growing waits (LIVEKIT_RETRY_SLEEP, seconds, default 10 30 60 120 180 = 6 tries after the first, about 6.7 min: the 2026-11-08 outage lasted longer than the first version's 2 min) and check the sha256 on every try,
    # so a truncated file is tried again as well. The release stays pinned by version and checksum; nothing is skipped. The workflows also cache $CACHE.
    ok=""; attempt=0
    for wait in 0 ${LIVEKIT_RETRY_SLEEP:-10 30 60 120 180}; do
      attempt=$((attempt + 1))
      [[ "$wait" != 0 ]] && { echo "start-livekit.sh: download attempt $((attempt - 1)) failed, waiting ${wait}s" >&2; sleep "$wait"; }
      if curl -fsSL --connect-timeout 15 --max-time 120 -o "$tarball" "$URL" && echo "$SHA256  $tarball" | sha256sum -c --quiet - 2>/dev/null; then ok=1; break; fi
    done
    [[ -n "$ok" ]] || { echo "start-livekit.sh: could not download a release with the pinned checksum after $attempt attempts" >&2; exit 1; }
    echo "start-livekit.sh: downloaded on attempt $attempt"
  fi
  echo "$SHA256  $tarball" | sha256sum -c --quiet - || { echo "start-livekit.sh: checksum mismatch for $tarball" >&2; exit 1; }
  tar -xzf "$tarball" -C "$tmp" livekit-server
  install -m 0755 "$tmp/livekit-server" "$BIN"
fi

# The backend's REDIS_* variables must not leak in: with REDIS_HOST set livekit-server runs in multi-node mode.
nohup env -u REDIS_HOST -u REDIS_PASSWORD "$BIN" --dev --bind 127.0.0.1 --node-ip 127.0.0.1 \
  --config-body "port: $PORT
rtc:
  tcp_port: $((PORT + 1))
  udp_port: $((PORT + 2))
  use_external_ip: false" > "$LOG" 2>&1 &
pid=$!
for _ in $(seq 1 30); do
  if answers; then echo "livekit up on ws://127.0.0.1:$PORT (pid $pid, log $LOG)"; exit 0; fi
  kill -0 "$pid" 2>/dev/null || break
  sleep 1
done
echo "livekit did not start"; tail -40 "$LOG"; exit 1
