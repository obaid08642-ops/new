# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_FAMILY_JOURNEY_AR.md`
- **Member SHA-256:** `1bbba6e17bfe9dfa70162cefd954d7dd6bf6a7e533bf9fd50919d20fa0d7f6a2`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: تمت مطابقة جزء العضوية الظاهر في `health/family-hub.tsx` على Web Family بإضافة `display_name`/`displayName` و`relation` إلى allowlist العرض، مع role وjoined_at. الحقول الصحية، permissions، group management، الدعوات، الانضمام، الدردشة، التقو`
- `9: Family Hub في الموبايل يملك create/join/invite وmember health وowner/member actions. لذلك أبقيت Web read-only؛ لا توجد أزرار أو mutations يمكن أن تتجاوز ownership أو authorization.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
