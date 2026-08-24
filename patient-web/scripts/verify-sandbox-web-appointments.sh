#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/appointments")"
if [[ "$status" != "200" ]]; then echo "Owner appointments route returned status $status" >&2; exit 1; fi
grep -Fq 'مواعيدي' "$body"
if grep -Fq 'وقت الانتظار' "$body" || grep -Fq 'ترتيب الانتظار' "$body"; then
  echo "Appointments page exposed an unsupported waiting field" >&2
  exit 1
fi

invalid_status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/ar/appointments/not-an-appointment")"
if [[ "$invalid_status" != "404" ]]; then echo "Invalid appointment identifier returned status $invalid_status" >&2; exit 1; fi

echo "verified Sandbox web appointments without exposing waiting or identifier data"
