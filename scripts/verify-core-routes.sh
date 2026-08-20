#!/usr/bin/env bash
set -euo pipefail

base="${BASE:-http://localhost:3000}"

check_route() {
  local path="$1"
  local expected_status="$2"
  local expected_text="$3"
  local body
  body="$(mktemp)"
  local status
  status="$(curl -sS -o "$body" -w '%{http_code}' "$base$path")"
  if [[ "$status" != "$expected_status" ]]; then
    echo "Expected $path to return $expected_status; received $status" >&2
    rm -f "$body"
    exit 1
  fi
  if ! grep -Fq "$expected_text" "$body"; then
    echo "Expected $path HTML to contain translated text: $expected_text" >&2
    rm -f "$body"
    exit 1
  fi
  rm -f "$body"
  echo "verified $path ($status)"
}

check_route "/ar" "200" "بوابة المريض الرقمية"
check_route "/en" "200" "Digital patient portal"
check_route "/ar/login" "200" "دخول المريض"
check_route "/en/login" "200" "Patient sign in"
check_route "/ar/nonexistent-route" "404" "الصفحة غير متاحة"
check_route "/en/nonexistent-route" "404" "Page unavailable"
check_route "/api/auth/session" "401" "authenticated"
check_route "/api/patient/orders/mine" "401" "authentication_required"

profile_status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/ar/profile")"
if [[ "$profile_status" != "307" ]]; then
  echo "Expected unauthenticated profile route to redirect; received $profile_status" >&2
  exit 1
fi
echo "verified /ar/profile redirects without a patient session"
