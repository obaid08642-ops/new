# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE10_ADMIN_DEPENDENCY_AUDIT_REMEDIATION_20260819.md`
- **Member SHA-256:** `078aad4c371e6ad392885b920a2d3c230f8a0725ada36159284a10a66391d9ea`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Next production build | **PASS** — Next 16.3.1, TypeScript/compile/prerender, 34 static routes. |`
- `16: | Branch upload | **PASS** — archive commit `c9a250c` (`fix: remediate admin dependency audit findings`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 10 — admin dependency-audit remediation`
- `5: The administrative dashboard had six high-severity audit findings, including a direct Next.js advisory path. The initial non-breaking upgrade moved Next and its ESLint companion from 16.2.10 to 16.3.1, reducing the direct framework findings`
- `12: | Admin governance contracts | **PASS** — 7/7. |`
- `15: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2`. |`
- `16: | Branch upload | **PASS** — archive commit `c9a250c` (`fix: remediate admin dependency audit findings`) is pushed to `manus/on-live-reconciliation`. |`
- `20: This result covers only the Admin dashboard dependency tree. Backend, Patient and Provider dependency advisories remain separate Phase 10 risks. No deployment or live mutation was performed.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
