#!/usr/bin/env bash
#
# 15.6 — Schemathesis OpenAPI fuzz gate: the backend must never return 5xx
# for bad/empty/fuzzed input.
#
#   backend/scripts/schemathesis_fuzz.sh --base-url <url> --spec <path-or-url>
#
# Exit codes:
#   0 — fuzz completed, zero 5xx responses (only the `not_a_server_error`
#       check runs by default, so any failure exit means a 5xx was seen).
#   1 — usage error, missing runner, or the target/spec could not be read.
#   2 — the run completed and found >= 1 response with status >= 500.
#
# Requirements: schemathesis >= 3 (`st` CLI; `schemathesis` also accepted),
#   e.g. `pip install "schemathesis>=3"`. Override the binary with
#   SCHEMATHESIS_BIN. A gates agent wires CI to this exact path/CLI; the CI
#   job itself lives outside backend/ (see P15_NOTES.md DEFERRED-OUT-OF-SCOPE).
#
# Examples:
#   ./backend/scripts/schemathesis_fuzz.sh \
#     --base-url http://localhost:8002 --spec backend/openapi.json
#   ./backend/scripts/schemathesis_fuzz.sh \
#     --base-url https://staging.nabd.plus --spec https://staging.nabd.plus/api/docs-json \
#     --auth-token "$STAGING_TOKEN" --max-examples 50
#   ./backend/scripts/schemathesis_fuzz.sh --base-url http://localhost:8002 \
#     --spec backend/openapi.json --dry-run
set -euo pipefail

BASE_URL=""
SPEC=""
AUTH_TOKEN=""
CHECKS="not_a_server_error"
WORKERS=""
MAX_EXAMPLES=""
DRY_RUN=0

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --base-url) BASE_URL="${2:?--base-url needs a value}"; shift 2 ;;
    --spec) SPEC="${2:?--spec needs a value}"; shift 2 ;;
    --auth-token) AUTH_TOKEN="${2:?--auth-token needs a value}"; shift 2 ;;
    --checks) CHECKS="${2:?--checks needs a value}"; shift 2 ;;
    --workers) WORKERS="${2:?--workers needs a value}"; shift 2 ;;
    --max-examples) MAX_EXAMPLES="${2:?--max-examples needs a value}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

[ -n "$BASE_URL" ] || { echo "ERROR: --base-url <url> is required" >&2; exit 1; }
[ -n "$SPEC" ] || { echo "ERROR: --spec <path-or-url> is required" >&2; exit 1; }

# Resolve the spec: local file (relative to repo root) or remote URL.
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$SPEC" ]; then
  SPEC_RESOLVED="$SPEC"
elif [ -f "$REPO_ROOT/$SPEC" ]; then
  SPEC_RESOLVED="$REPO_ROOT/$SPEC"
elif [[ "$SPEC" =~ ^https?:// ]]; then
  SPEC_RESOLVED="$SPEC"
else
  echo "ERROR: --spec not found as file and not a URL: $SPEC" >&2
  exit 1
fi

# Resolve the runner (for --dry-run, report what *would* resolve without failing).
resolve_runner() {
  if [ -n "${SCHEMATHESIS_BIN:-}" ]; then echo "$SCHEMATHESIS_BIN";
  elif command -v st >/dev/null 2>&1; then echo "st";
  elif command -v schemathesis >/dev/null 2>&1; then echo "schemathesis";
  else echo "<unresolved: pip install \"schemathesis>=3\">";
  fi
}
RUNNER="$(resolve_runner)"
if [ "$DRY_RUN" -eq 0 ] && [[ "$RUNNER" == "<unresolved"* ]]; then
  echo "ERROR: no Schemathesis runner found (looked for \$SCHEMATHESIS_BIN, 'st', 'schemathesis')." >&2
  echo "Install it first: pip install \"schemathesis>=3\"" >&2
  exit 1
fi

CMD=("$RUNNER" "run" "$SPEC_RESOLVED" "--base-url" "$BASE_URL" "--checks" "$CHECKS")
[ -n "$WORKERS" ] && CMD+=("--workers" "$WORKERS")
[ -n "$MAX_EXAMPLES" ] && CMD+=("--max-examples" "$MAX_EXAMPLES")
if [ -n "$AUTH_TOKEN" ]; then
  CMD+=("-H" "Authorization: Bearer $AUTH_TOKEN")
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "base-url: $BASE_URL"
  echo "spec:     $SPEC_RESOLVED"
  echo "runner:   $RUNNER"
  echo "command:  ${CMD[*]}"
  exit 0
fi

echo "15.6 fuzz: ${CMD[*]}"
LOG="$(mktemp -t schemathesis-fuzz.XXXXXX)"
trap 'rm -f "$LOG"' EXIT
STATUS=0
"${CMD[@]}" 2>&1 | tee "$LOG" || STATUS=$?

if [ "$STATUS" -eq 0 ]; then
  echo "15.6 fuzz PASS: no 5xx responses (checks: $CHECKS)."
  exit 0
fi

# Non-zero from the runner with only not_a_server_error enabled means a 5xx
# was observed (or the target was unreachable — fail closed either way).
echo "15.6 fuzz FAIL: runner exited $STATUS — 5xx found or target unreachable. Tail:" >&2
tail -n 40 "$LOG" >&2
exit 2
