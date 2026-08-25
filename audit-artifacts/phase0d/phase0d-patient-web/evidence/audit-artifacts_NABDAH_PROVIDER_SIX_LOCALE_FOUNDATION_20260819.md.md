# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_SIX_LOCALE_FOUNDATION_20260819.md`
- **Member SHA-256:** `a8f951f88f06c643873b6aed2d8ae1b1fe587cdea0f0813e1861126d13897782`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: The work is intentionally limited to the **99 shared UI keys** in `src/constants/index.ts`. It does not claim that every provider screen, accessibility label, validation path, push notification, server error, or rich workflow has already re`
- `62: 1. Inventory and migrate the approximately 49 provider source files that still contain AR/EN-specific presentation branches; no claim of complete screen-level six-locale coverage is made here.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `11: The work is intentionally limited to the **99 shared UI keys** in `src/constants/index.ts`. It does not claim that every provider screen, accessibility label, validation path, push notification, server error, or rich workflow has already re`
- `17: | Typed language model | Expanded `Lang` from `ar/en` to `ar/en/ur/hi/bn/fil`. | All six locale identifiers are valid application state. |`
- `20: | Persisted preference | Saved `APP_LANG` values are accepted only when they are one of the six typed locale codes. | Unknown/stale values do not become application language state. |`
- `33: | Empty values | **PASS — none** |`
- `35: | Key-set equality per added locale | **PASS — confirmed by Jest regression test** |`
- `63: 2. Conduct fluent human review of every locale, including medical terminology, truncation, font coverage, keyboard behavior, error messages, and accessibility labels.`
### payment_insurance_relevance
- `47: | Archive integrity | `unzip -t` and excluded-directory inspection | **PASS — no `node_modules`, `dist`, `coverage`, or `.expo` entries** |`
- `62: 1. Inventory and migrate the approximately 49 provider source files that still contain AR/EN-specific presentation branches; no claim of complete screen-level six-locale coverage is made here.`
- `63: 2. Conduct fluent human review of every locale, including medical terminology, truncation, font coverage, keyboard behavior, error messages, and accessibility labels.`
- `65: 4. Complete the existing source-contract, deployment-approval, sandbox E2E, payment activation, consent/QR/location approval, and physical-device blockers before revising the overall GO/NO-GO decision.`
### error_empty_loading_retry_cancel
- `11: The work is intentionally limited to the **99 shared UI keys** in `src/constants/index.ts`. It does not claim that every provider screen, accessibility label, validation path, push notification, server error, or rich workflow has already re`
- `33: | Empty values | **PASS — none** |`
- `63: 2. Conduct fluent human review of every locale, including medical terminology, truncation, font coverage, keyboard behavior, error messages, and accessibility labels.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
