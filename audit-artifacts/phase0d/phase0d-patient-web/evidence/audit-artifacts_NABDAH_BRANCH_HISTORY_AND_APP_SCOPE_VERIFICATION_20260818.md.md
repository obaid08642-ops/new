# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_BRANCH_HISTORY_AND_APP_SCOPE_VERIFICATION_20260818.md`
- **Member SHA-256:** `36b7e981b8c699a30120c0c3f27b5689f7101df0b9746e2ed57b067f61ee1a78`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | `f2bffa28` | Global effective-role/RolesGuard fix | Yes | No |`
- `13: | `f6fa8a8` | Order report ownership and PDF repair | Yes | No |`
- `14: | `d2ef9a8` | OTP/2FA closure and gateway error hardening | Yes | No |`
- `18: | `859e5b7` | Admin and Expo web build validation | Yes | No |`
- `19: | `e9fdd1b` | Provider archive refresh from restored source | Yes | No |`
- `30: | Admin dashboard | `Napd-admin-dashboard.zip` | Present |`
- `36: The earlier statement that the old `fix/e2e-operational-contracts-20260814` branch was the current executable source was wrong after the later reconciliation commits. The correct branch for the latest combined Backend + Patient + Provider +`
### state_transitions
- `14: | `d2ef9a8` | OTP/2FA closure and gateway error hardening | Yes | No |`
- `36: The earlier statement that the old `fix/e2e-operational-contracts-20260814` branch was the current executable source was wrong after the later reconciliation commits. The correct branch for the latest combined Backend + Patient + Provider +`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: | `d2ef9a8` | OTP/2FA closure and gateway error hardening | Yes | No |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
