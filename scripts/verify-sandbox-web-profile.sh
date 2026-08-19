#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
owner_jar="$(mktemp)"
other_jar="$(mktemp)"
dashboard_body="$(mktemp)"
owner_body="$(mktemp)"
other_body="$(mktemp)"
trap 'rm -f "$owner_jar" "$other_jar" "$dashboard_body" "$owner_body" "$other_body"' EXIT

login() {
  local email="$1" password="$2" jar="$3"
  local payload status
  payload="$(printf '{"identifier":"%s","password":"%s"}' "$email" "$password")"
  status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
  if [[ "$status" != "200" ]]; then echo "Sandbox login returned status $status" >&2; exit 1; fi
}

login "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD" "$owner_jar"
login "$NABD_SANDBOX_OTHER_EMAIL" "$NABD_SANDBOX_OTHER_PASSWORD" "$other_jar"

dashboard_status="$(curl -sS -b "$owner_jar" -o "$dashboard_body" -w '%{http_code}' "$base/ar/dashboard")"
if [[ "$dashboard_status" != "200" ]]; then echo "Owner dashboard route returned status $dashboard_status" >&2; exit 1; fi
grep -Fq '/ar/orders' "$dashboard_body"
grep -Fq '/ar/profile' "$dashboard_body"

owner_status="$(curl -sS -b "$owner_jar" -o "$owner_body" -w '%{http_code}' "$base/ar/profile")"
if [[ "$owner_status" != "200" ]]; then echo "Owner profile route returned status $owner_status" >&2; exit 1; fi
if ! grep -Fq 'ملفي الصحي' "$owner_body"; then echo "Owner profile route missed its translated title" >&2; exit 1; fi
for label in 'الجنس' 'مدخن' 'يتناول الكحول' 'حامل' 'مرضعة'; do
  if ! grep -Fq "$label" "$owner_body"; then echo "Owner profile route missed a permitted live medical field label" >&2; exit 1; fi
done

other_status="$(curl -sS -b "$other_jar" -o "$other_body" -w '%{http_code}' "$base/ar/profile")"
if [[ "$other_status" != "200" ]]; then echo "Other profile route returned status $other_status" >&2; exit 1; fi
if ! grep -Fq 'ملفي الصحي' "$other_body"; then echo "Other profile route missed its translated title" >&2; exit 1; fi
if grep -Fq "$NABD_SANDBOX_OWNER_EMAIL" "$other_body"; then
  echo "The other Sandbox profile page exposed the owner's email" >&2
  exit 1
fi

echo "verified Sandbox web profile isolation without exposing profile data"
