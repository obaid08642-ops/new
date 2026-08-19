#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"
order_id="91047ef2-ad36-422a-a184-629693e7c729"
owner_jar="$(mktemp)"
other_jar="$(mktemp)"
owner_list_body="$(mktemp)"
other_list_body="$(mktemp)"
owner_body="$(mktemp)"
other_body="$(mktemp)"
trap 'rm -f "$owner_jar" "$other_jar" "$owner_list_body" "$other_list_body" "$owner_body" "$other_body"' EXIT

login() {
  local email="$1"
  local password="$2"
  local jar="$3"
  local payload
  payload="$(printf '{"identifier":"%s","password":"%s"}' "$email" "$password")"
  local status
  status="$(curl -sS -o /dev/null -c "$jar" -w '%{http_code}' -X POST "$base/api/auth/login" -H 'content-type: application/json' --data "$payload")"
  test "$status" = "200"
  test -s "$jar"
}

login "$NABD_SANDBOX_OWNER_EMAIL" "$NABD_SANDBOX_OWNER_PASSWORD" "$owner_jar"
login "$NABD_SANDBOX_OTHER_EMAIL" "$NABD_SANDBOX_OTHER_PASSWORD" "$other_jar"

owner_list_status="$(curl -sS -b "$owner_jar" -o "$owner_list_body" -w '%{http_code}' "$base/ar/orders")"
test "$owner_list_status" = "200"
grep -Fq "$order_id" "$owner_list_body"

other_list_status="$(curl -sS -b "$other_jar" -o "$other_list_body" -w '%{http_code}' "$base/ar/orders")"
test "$other_list_status" = "200"
if grep -Fq "$order_id" "$other_list_body"; then
  echo "The other Sandbox account list exposed the owner's order identifier" >&2
  exit 1
fi

owner_status="$(curl -sS -b "$owner_jar" -o "$owner_body" -w '%{http_code}' "$base/ar/orders/$order_id")"
test "$owner_status" = "200"
grep -Fq "$order_id" "$owner_body"

other_status="$(curl -sS -b "$other_jar" -o "$other_body" -w '%{http_code}' "$base/ar/orders/$order_id")"
test "$other_status" = "404"
grep -Fq 'الصفحة غير متاحة' "$other_body"

echo "verified Sandbox web order ownership without exposing credentials or tokens"
