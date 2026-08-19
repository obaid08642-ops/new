#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/family")"
if [[ "$status" != "200" ]]; then echo "Owner family route returned status $status" >&2; exit 1; fi
grep -Fq 'أعضاء العائلة' "$body"
grep -Fq 'لا تُعرض المعرّفات أو الصلاحيات أو السجلات الصحية أو الدعوات' "$body"

echo "verified Sandbox web family list without identifiers, permissions, records, or invitations"
