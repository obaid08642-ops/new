# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_DOCTOR_RECEPTION_GAPS_20260819.md`
- **Member SHA-256:** `b6f5fccba8e35b06c7f9e726c59ceea0a5f6b6402c8b35b3370d752fe801b5aa`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: | **P1** | Error recovery card is unreachable | `error` is initialized/cleared but not set on fetch failure; catch shows a toast only, leaving prior/empty queue state without retry context. | Set deterministic error state, distinguish stale`
- `13: | **P1** | SOS dispatch remains reachable from doctor dashboard | Alert action routes directly to SOS dispatch while related governance remains unapproved. | Keep SOS/location/QR strictly fail-closed pending owner legal/product approval. |`
### backend_consumers_or_contracts
- `7: | **P0** | Clinic cash collection is a local success toast, not a financial transition | “Cash collected” only displays success and navigates to consultation; it does not call any server payment-receipt/appointment-state contract. | Remove `
- `11: | **P1** | Urgent-request WebSocket uses a derived endpoint/token model that can drift from the secure API client | It derives socket origin from a string replacement over `API_BASE`, reads a token ad hoc from user state and joins room by a`
### auth_ownership
- `7: | **P0** | Clinic cash collection is a local success toast, not a financial transition | “Cash collected” only displays success and navigates to consultation; it does not call any server payment-receipt/appointment-state contract. | Remove `
- `11: | **P1** | Urgent-request WebSocket uses a derived endpoint/token model that can drift from the secure API client | It derives socket origin from a string replacement over `API_BASE`, reads a token ad hoc from user state and joins room by a`
- `13: | **P1** | SOS dispatch remains reachable from doctor dashboard | Alert action routes directly to SOS dispatch while related governance remains unapproved. | Keep SOS/location/QR strictly fail-closed pending owner legal/product approval. |`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Clinic cash collection is a local success toast, not a financial transition | “Cash collected” only displays success and navigates to consultation; it does not call any server payment-receipt/appointment-state contract. | Remove `
- `8: | **P0** | Provider insurance decision is free-form and can claim a patient copay handoff without verified decision | Doctor enters arbitrary approval code, coverage and copay, then posts a generic provider-job insurance payload. There is n`
- `9: | **P1** | Reception DTO contains fabricated patient, time and payment labels | Missing patient becomes “Nabdah Patient,” no schedule becomes “unscheduled,” no insurance becomes cash, and UI computes payment status/type badges locally. | Re`
- `10: | **P1** | Error recovery card is unreachable | `error` is initialized/cleared but not set on fetch failure; catch shows a toast only, leaving prior/empty queue state without retry context. | Set deterministic error state, distinguish stale`
- `11: | **P1** | Urgent-request WebSocket uses a derived endpoint/token model that can drift from the secure API client | It derives socket origin from a string replacement over `API_BASE`, reads a token ad hoc from user state and joins room by a`
- `12: | **P1** | Patient intake uses emoji/text badges and only Arabic/English clinical/payment copy | Consultation type and payment are expressed in hard-coded emoji strings and not six-language/accessible format. | Replace with accessible vecto`
- `13: | **P1** | SOS dispatch remains reachable from doctor dashboard | Alert action routes directly to SOS dispatch while related governance remains unapproved. | Keep SOS/location/QR strictly fail-closed pending owner legal/product approval. |`
- `17: Doctor consultation reception is **FIX/BLOCKED**. Cash and insurance UI can state operational/financial success without a server-authoritative transaction or decision, and realtime/error behavior is not yet safe for provider operations.`
### payment_insurance_relevance
- `7: | **P0** | Clinic cash collection is a local success toast, not a financial transition | “Cash collected” only displays success and navigates to consultation; it does not call any server payment-receipt/appointment-state contract. | Remove `
- `8: | **P0** | Provider insurance decision is free-form and can claim a patient copay handoff without verified decision | Doctor enters arbitrary approval code, coverage and copay, then posts a generic provider-job insurance payload. There is n`
- `9: | **P1** | Reception DTO contains fabricated patient, time and payment labels | Missing patient becomes “Nabdah Patient,” no schedule becomes “unscheduled,” no insurance becomes cash, and UI computes payment status/type badges locally. | Re`
- `10: | **P1** | Error recovery card is unreachable | `error` is initialized/cleared but not set on fetch failure; catch shows a toast only, leaving prior/empty queue state without retry context. | Set deterministic error state, distinguish stale`
- `12: | **P1** | Patient intake uses emoji/text badges and only Arabic/English clinical/payment copy | Consultation type and payment are expressed in hard-coded emoji strings and not six-language/accessible format. | Replace with accessible vecto`
- `17: Doctor consultation reception is **FIX/BLOCKED**. Cash and insurance UI can state operational/financial success without a server-authoritative transaction or decision, and realtime/error behavior is not yet safe for provider operations.`
### error_empty_loading_retry_cancel
- `10: | **P1** | Error recovery card is unreachable | `error` is initialized/cleared but not set on fetch failure; catch shows a toast only, leaving prior/empty queue state without retry context. | Set deterministic error state, distinguish stale`
- `13: | **P1** | SOS dispatch remains reachable from doctor dashboard | Alert action routes directly to SOS dispatch while related governance remains unapproved. | Keep SOS/location/QR strictly fail-closed pending owner legal/product approval. |`
- `17: Doctor consultation reception is **FIX/BLOCKED**. Cash and insurance UI can state operational/financial success without a server-authoritative transaction or decision, and realtime/error behavior is not yet safe for provider operations.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
