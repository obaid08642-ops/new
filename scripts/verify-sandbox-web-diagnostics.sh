#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
jar="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$jar" "$body"' EXIT

payload="$(printf '{"identifier":"%s","password":"%s"}' "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD")"
status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi

status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/diagnostics")"
if [[ "$status" != "200" ]]; then echo "Owner diagnostics route returned status $status" >&2; exit 1; fi
grep -Fq 'الفحوصات التشخيصية' "$body"

for domain in labs radiology; do
  booking_id="$(curl -sS -b "$jar" "$base/api/patient/$domain/bookings/mine" | jq -r '(if type == "array" then .[0].id elif (.data | type) == "array" then .data[0].id elif (.items | type) == "array" then .items[0].id elif (.results | type) == "array" then .results[0].id else empty end) // empty' | head -n 1)"
  if [[ -n "$booking_id" ]]; then
    status="$(curl -sS -b "$jar" -o "$body" -w '%{http_code}' "$base/ar/diagnostics/$domain/$booking_id")"
    if [[ "$status" != "200" ]]; then echo "Owner $domain detail route returned status $status" >&2; exit 1; fi
    grep -Fq 'تُعرض حالة الحجز وموعده فقط' "$body"
  fi
done

invalid_status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/ar/diagnostics/admin/not-a-booking")"
if [[ "$invalid_status" != "404" ]]; then echo "Invalid diagnostic route returned status $invalid_status" >&2; exit 1; fi

echo "verified Sandbox web diagnostics without exposing reports, documents, or pricing"
