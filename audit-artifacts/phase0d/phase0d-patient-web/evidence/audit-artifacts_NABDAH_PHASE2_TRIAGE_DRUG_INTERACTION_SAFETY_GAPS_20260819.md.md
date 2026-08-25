# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_TRIAGE_DRUG_INTERACTION_SAFETY_GAPS_20260819.md`
- **Member SHA-256:** `4a6136f8dc61458de3ae63bf4d92abd98413e542deaa96bb0b59b903d95bac65`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Drug interaction scanner client and Backend contract are incompatible | Client sends `{meds, newDrug}`; compatibility route accepts `{drugs, drug}` and therefore ignores the new drug. Client expects `safe_interactions`, severity `
- `9: | **P0** | Drug-interaction compatibility endpoint lacks local JWT guard | `AiInteractionsController` in the compatibility module has no `@UseGuards(JwtAuthGuard)` despite receiving `@CurrentUser`; it cannot reliably bind the request to an `
- `11: | **P0** | Triage UI fabricates tests/actions and has a dead non-emergency action | If optional `urgency` appears, UI inserts fixed ECG/cardiac-enzyme or vitals tests irrespective of clinical input. The consultation button body is empty; on`
- `12: | **P1** | Scan failure is indistinguishable from a safe result | Catching an API error sets `interactions: []` then displays a reassuring result and “no known safe interactions.” | Preserve error status, require retry, and explicitly state`
- `22: | **P0** | Emergency action bypasses the required fail-closed governance boundary | Severe symptom paths encourage immediate emergency behavior and route to the emergency screen despite the emergency/QR/consent contract remaining unapproved`
- `29: | **P0** | AI chat is presented as an available physician/consultant | The screen is called “AI doctor,” says it is connected, labels the assistant a virtual consultant, and invites symptom, lab-result, and medicine advice. It is the same g`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: | **P0** | Drug-interaction compatibility endpoint lacks local JWT guard | `AiInteractionsController` in the compatibility module has no `@UseGuards(JwtAuthGuard)` despite receiving `@CurrentUser`; it cannot reliably bind the request to an `
- `22: | **P0** | Emergency action bypasses the required fail-closed governance boundary | Severe symptom paths encourage immediate emergency behavior and route to the emergency screen despite the emergency/QR/consent contract remaining unapproved`
- `31: | **P1** | Chat safety copy and timestamps are hard-coded Arabic/local | Intro, suggestions, errors, online status, and “now” timestamps are raw Arabic and do not reflect a real provider session. | Complete reviewed six-language copy and di`
- `35: Both patient-facing AI medical capabilities are **P0 FIX/BLOCKED**. They must not be represented as diagnostic or complete drug-safety services until their contracts, clinical governance, authorization, truthful availability/error behavior,`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Drug interaction scanner client and Backend contract are incompatible | Client sends `{meds, newDrug}`; compatibility route accepts `{drugs, drug}` and therefore ignores the new drug. Client expects `safe_interactions`, severity `
- `8: | **P0** | Scanner claims a large clinical database but uses five static compatibility rules | UI claims “50,000+ interactions”; Backend scans five hard-coded rules only. This is materially misleading and cannot be relied on for medication `
- `9: | **P0** | Drug-interaction compatibility endpoint lacks local JWT guard | `AiInteractionsController` in the compatibility module has no `@UseGuards(JwtAuthGuard)` despite receiving `@CurrentUser`; it cannot reliably bind the request to an `
- `10: | **P0** | Symptom triage is a generic LLM chat presented as medical classification | `/ai/triage/chat` merely forwards user-supplied conversation to a generic “helpful” medical-assistant prompt and returns unstructured text. It has no clin`
- `11: | **P0** | Triage UI fabricates tests/actions and has a dead non-emergency action | If optional `urgency` appears, UI inserts fixed ECG/cardiac-enzyme or vitals tests irrespective of clinical input. The consultation button body is empty; on`
- `12: | **P1** | Scan failure is indistinguishable from a safe result | Catching an API error sets `interactions: []` then displays a reassuring result and “no known safe interactions.” | Preserve error status, require retry, and explicitly state`
- `13: | **P1** | Medical suggestions and labels are Arabic-only and lack accessible context | Triage introduction, medical claims, errors, recommendation card, scanner content, and hard-coded medicine suggestions do not cover six locales or user-`
- `22: | **P0** | Emergency action bypasses the required fail-closed governance boundary | Severe symptom paths encourage immediate emergency behavior and route to the emergency screen despite the emergency/QR/consent contract remaining unapproved`
- `29: | **P0** | AI chat is presented as an available physician/consultant | The screen is called “AI doctor,” says it is connected, labels the assistant a virtual consultant, and invites symptom, lab-result, and medicine advice. It is the same g`
- `31: | **P1** | Chat safety copy and timestamps are hard-coded Arabic/local | Intro, suggestions, errors, online status, and “now” timestamps are raw Arabic and do not reflect a real provider session. | Complete reviewed six-language copy and di`
- `35: Both patient-facing AI medical capabilities are **P0 FIX/BLOCKED**. They must not be represented as diagnostic or complete drug-safety services until their contracts, clinical governance, authorization, truthful availability/error behavior,`
### payment_insurance_relevance
- `8: | **P0** | Scanner claims a large clinical database but uses five static compatibility rules | UI claims “50,000+ interactions”; Backend scans five hard-coded rules only. This is materially misleading and cannot be relied on for medication `
- `11: | **P0** | Triage UI fabricates tests/actions and has a dead non-emergency action | If optional `urgency` appears, UI inserts fixed ECG/cardiac-enzyme or vitals tests irrespective of clinical input. The consultation button body is empty; on`
- `13: | **P1** | Medical suggestions and labels are Arabic-only and lack accessible context | Triage introduction, medical claims, errors, recommendation card, scanner content, and hard-coded medicine suggestions do not cover six locales or user-`
- `23: | **P1** | Body map and symptom library are static Arabic taxonomy | The map/library does not cover a governed symptom ontology, causes ambiguous region-to-symptom mapping, and has no six-language/RTL-LTR clinical-content review. | Use a re`
### error_empty_loading_retry_cancel
- `7: | **P0** | Drug interaction scanner client and Backend contract are incompatible | Client sends `{meds, newDrug}`; compatibility route accepts `{drugs, drug}` and therefore ignores the new drug. Client expects `safe_interactions`, severity `
- `11: | **P0** | Triage UI fabricates tests/actions and has a dead non-emergency action | If optional `urgency` appears, UI inserts fixed ECG/cardiac-enzyme or vitals tests irrespective of clinical input. The consultation button body is empty; on`
- `12: | **P1** | Scan failure is indistinguishable from a safe result | Catching an API error sets `interactions: []` then displays a reassuring result and “no known safe interactions.” | Preserve error status, require retry, and explicitly state`
- `13: | **P1** | Medical suggestions and labels are Arabic-only and lack accessible context | Triage introduction, medical claims, errors, recommendation card, scanner content, and hard-coded medicine suggestions do not cover six locales or user-`
- `31: | **P1** | Chat safety copy and timestamps are hard-coded Arabic/local | Intro, suggestions, errors, online status, and “now” timestamps are raw Arabic and do not reflect a real provider session. | Complete reviewed six-language copy and di`
- `35: Both patient-facing AI medical capabilities are **P0 FIX/BLOCKED**. They must not be represented as diagnostic or complete drug-safety services until their contracts, clinical governance, authorization, truthful availability/error behavior,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
