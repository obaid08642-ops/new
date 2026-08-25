# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_EXIT_CRITERIA_REVIEW_20260819.md`
- **Member SHA-256:** `1c646b8694a6eb050bf3a3ab70900e53f6ccdabaecc7ccd465fbb5feee9de8db`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | جرد Backend وPatient وProvider وAdmin | `NABDAH_PHASE13_CONTRACT_INVENTORY_V4_20260819.json` يرصد 1,342 route و333 consumer call و238 عقداً فريداً. | PASS |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: | جرد Backend وPatient وProvider وAdmin | `NABDAH_PHASE13_CONTRACT_INVENTORY_V4_20260819.json` يرصد 1,342 route و333 consumer call و238 عقداً فريداً. | PASS |`
- `19: | تمييز ما لا يثبته المصدر الثابت | ملخصات inventory وUI تصرح بعدم إثبات role/BOLA/schema/transition/persistence/audit/runtime وتبقيها INCONCLUSIVE حتى Sandbox. | PASS |`
- `28: | أزرار server-call المرشحة | Phase 14 ثم Phase 16 | يلزم schema/role/ownership/transition قبل ثم runtime evidence بعد النشر المصرح. |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
