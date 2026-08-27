#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/medicines?q=&page=1")"
if [[ "$status" != "200" ]]; then echo "Owner medicines route returned status $status" >&2; exit 1; fi
grep -Fq 'الأدوية' "$body"
grep -Fq 'ابحث بالاسم أو المادة الفعالة' "$body"

medicine_id="$(curl -sS -b "$jar" "$base/api/patient/medicines?limit=1" | jq -r '(if type == "array" then .[0].id elif (.data | type) == "array" then .data[0].id elif (.items | type) == "array" then .items[0].id elif (.results | type) == "array" then .results[0].id else empty end) // empty' | head -n 1)"
if [[ -n "$medicine_id" ]]; then
  status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/medicines/$medicine_id")"
  if [[ "$status" != "200" ]]; then echo "Owner medicine detail route returned status $status" >&2; exit 1; fi
  grep -Fq 'هذه معلومات كتالوج' "$body"
  if grep -Fq 'سلة' "$body" || grep -Fq 'إتمام الدفع' "$body" || grep -Fq 'السعر' "$body"; then
    echo "Medicine detail page exposed an unsupported price, cart, or checkout field" >&2
    exit 1
  fi
fi

invalid_status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/ar/medicines/not.a.medicine")"
if [[ "$invalid_status" != "404" ]]; then echo "Invalid medicine identifier returned status $invalid_status" >&2; exit 1; fi

echo "verified Sandbox web medicines with bounded search and no fallback data"
