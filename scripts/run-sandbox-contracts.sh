#!/usr/bin/env bash
set -euo pipefail

cooldown_seconds="${SANDBOX_COOLDOWN_SECONDS:-70}"

batches=(
  "lib/api/sandbox-secrets.test.ts lib/api/sandbox-order-ownership.test.ts"
  "lib/api/sandbox-appointments-contracts.test.ts lib/api/sandbox-diagnostics-contracts.test.ts lib/api/sandbox-specialty-provider-count.test.ts"
  "lib/api/sandbox-home-care-contract.test.ts lib/api/sandbox-medicines-contract.test.ts"
  "lib/api/sandbox-family-contract.test.ts lib/api/sandbox-notifications-contract.test.ts"
  "lib/api/sandbox-chat-contract.test.ts lib/api/sandbox-prescriptions-contract.test.ts"
  "lib/api/sandbox-profile-contracts.test.ts lib/api/sandbox-reminders-contract.test.ts"
  "lib/api/sandbox-vitals-contract.test.ts"
)

for index in "${!batches[@]}"; do
  if [[ "$index" -gt 0 ]]; then
    printf 'Cooling down Sandbox login rate for %ss before batch %s/%s...\n' "$cooldown_seconds" "$((index + 1))" "${#batches[@]}"
    sleep "$cooldown_seconds"
  fi

  printf 'Running read-only Sandbox contract batch %s/%s...\n' "$((index + 1))" "${#batches[@]}"
  RUN_SANDBOX_TESTS=true pnpm vitest run ${batches[$index]}
done
