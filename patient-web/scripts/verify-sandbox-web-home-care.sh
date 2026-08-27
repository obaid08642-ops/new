#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/home-care")"
if [[ "$status" != "200" ]]; then echo "Owner home-care route returned status $status" >&2; exit 1; fi
grep -Fq 'حجوزات الرعاية المنزلية' "$body"
grep -Fq 'بيانات الموقع أو التتبع أو المعلومات السريرية أو التسعير' "$body"

echo "verified Sandbox web home-care list without uncontracted detail or sensitive data"
