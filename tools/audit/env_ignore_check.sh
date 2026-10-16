#!/usr/bin/env bash
# Phase 16.1 — no environment file enters the repository, in any app.
# Fails when a `.env` / `.env.*` file (except `*.example` templates) is tracked
# or is not ignored. Run in CI on every PR (see .github/workflows/security.yml).
set -euo pipefail
cd "$(dirname "$0")/../.."

fail=0
say() { printf '%s\n' "$1"; }

# 1. No live env file may be tracked (templates ending in .example are fine).
tracked=$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.example$' || true)
if [ -n "$tracked" ]; then
  say "FAIL: tracked env files (must be ignored, only *.example may be tracked):"
  say "$tracked"
  fail=1
else
  say "ok: no live .env files tracked"
fi

# 2. Every app must ignore .env and .env.* (git check-ignore proves it).
for app in backend patient-web patient-app provider-app admin; do
  for name in .env .env.local .env.production .env.development .env.test; do
    if git check-ignore -q "$app/$name"; then
      say "ok: ignored $app/$name"
    else
      say "FAIL: not ignored: $app/$name"
      fail=1
    fi
  done
done
if git check-ignore -q "deploy/.env.production"; then
  say "ok: ignored deploy/.env.production"
else
  say "FAIL: not ignored: deploy/.env.production"
  fail=1
fi

# 3. Templates must stay tracked (never ignored).
for tpl in deploy/.env.production.example patient-web/.env.production.example; do
  if [ -f "$tpl" ] && git check-ignore -q "$tpl"; then
    say "FAIL: template is ignored (must stay tracked): $tpl"
    fail=1
  fi
done
say "ok: templates stay tracked"

exit $fail
