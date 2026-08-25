# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_VITALS_CONTRACT_CLINICAL_SAFETY_GAP_20260819.md`
- **Member SHA-256:** `6abc6da453850484d0268947f98a6e941f87c5a4f83421cb6fc281343bc3177a`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: | Input UX | Patient enables save with only `value1`; BP diastolic can be absent and values are not checked for numeric/range validity before submission | **FIX — require and validate appropriate fields before submit, preserve decimal suppo`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `25: Backend ownership is patient-scoped (`patient_id: user.id`) for vital read/write operations. This does not compensate for the broken type/payload contract or incorrect clinical labels.`
### state_transitions
- `3: ## Confirmed Patient-to-Backend mismatches`
- `7: | Sends `type: sugar` | Backend accepts `glucose` | Sugar logs are rejected as `invalid type` |`
- `8: | Sends `type: heart` | Backend accepts `heart_rate` | Heart-rate logs are rejected as `invalid type` |`
- `9: | For blood pressure sends `systolic` and `diastolic` without `value` | Backend requires `data.value` and stores a primary `value` plus optional `value_secondary` | Blood-pressure logs are rejected as `value required` |`
- `11: | Renders recent result fields as `r.val`, `r.time`, `r.status`, and `r.statusColor` | Backend returns persisted fields including `value` and `measured_at`, not these presentation fields | Recent-reading content and status treatment are not`
- `13: ## Confirmed clinical-truthfulness defects`
- `17: | Patient summary badge | Uses `avg < 130` to label every vital normal/high, including glucose, heart rate, and weight | **P0 clinical-safety FIX — do not apply blood-pressure thresholds to unrelated vital types; use type/context-aware, rev`
- `21: | Chart status | Bar color uses `val > 130` for every vital type | **FIX — use type-appropriate neutral visualization or a reviewed configuration, and never communicate false clinical severity through color** |`
### payment_insurance_relevance
- `25: Backend ownership is patient-scoped (`patient_id: user.id`) for vital read/write operations. This does not compensate for the broken type/payload contract or incorrect clinical labels.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
