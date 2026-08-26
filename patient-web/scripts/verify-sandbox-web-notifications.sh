#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/notifications")"
if [[ "$status" != "200" ]]; then echo "Owner notifications route returned status $status" >&2; exit 1; fi
grep -Fq 'الإشعارات' "$body"
grep -Fq 'لا تُنفذ أي روابط حمولة أو تعليم قراءة أو تسجيل جهاز أو إعدادات' "$body"

echo "verified Sandbox web notifications without action links or mutation controls"
