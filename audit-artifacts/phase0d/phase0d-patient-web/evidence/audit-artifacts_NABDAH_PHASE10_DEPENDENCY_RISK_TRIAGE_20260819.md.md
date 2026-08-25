# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE10_DEPENDENCY_RISK_TRIAGE_20260819.md`
- **Member SHA-256:** `6bbec058760016d1ab56c36bcb2e79740e4d27074a5aaffea1750a02ca69085e`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Phase 10 read-only audit separated low-risk lockfile updates from framework migrations and packages with no published fix. Only the Admin dependency tree qualified for immediate non-breaking remediation and was reduced to zero audit fin`
- `9: | Admin | 6 | 6 | Direct Next.js patch plus transitive lockfile updates were available and verified. | **Remediated** — 0 findings; see `NABDAH_PHASE10_ADMIN_DEPENDENCY_AUDIT_REMEDIATION_20260819.md`. |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `7: | Surface | Initial audit total | High | Triage | Decision |`
- `16: Backend high-risk paths include framework upgrade candidates for `@nestjs/platform-express` and tooling paths (`@nestjs/cli`/glob/picomatch/tmp), plus direct `xlsx` findings that do not provide a published automated fix. Patient findings in`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
