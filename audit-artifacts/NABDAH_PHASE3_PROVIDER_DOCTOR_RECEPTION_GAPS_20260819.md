# Phase 3 Provider — doctor consultation reception gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Clinic cash collection is a local success toast, not a financial transition | “Cash collected” only displays success and navigates to consultation; it does not call any server payment-receipt/appointment-state contract. | Remove the action or require a server-owned, idempotent cash-receipt/authorization workflow with amount, collector, receipt/reference, audit and patient-visible state before consultation. |
| **P0** | Provider insurance decision is free-form and can claim a patient copay handoff without verified decision | Doctor enters arbitrary approval code, coverage and copay, then posts a generic provider-job insurance payload. There is no insurer verification, policy/item evidence, quote reconciliation or formal payment-intent response displayed. | Use the canonical insurance decision state machine with verified authority/evidence, server calculated copay/coverage, patient approval/payment handoff and audit; do not claim completion before a persisted response. |
| **P1** | Reception DTO contains fabricated patient, time and payment labels | Missing patient becomes “Nabdah Patient,” no schedule becomes “unscheduled,” no insurance becomes cash, and UI computes payment status/type badges locally. | Render a versioned, server-authoritative queue DTO with explicit unknown/unavailable states; never infer payment or patient identity. |
| **P1** | Error recovery card is unreachable | `error` is initialized/cleared but not set on fetch failure; catch shows a toast only, leaving prior/empty queue state without retry context. | Set deterministic error state, distinguish stale/empty/error data, and provide retry without fabricating figures. |
| **P1** | Urgent-request WebSocket uses a derived endpoint/token model that can drift from the secure API client | It derives socket origin from a string replacement over `API_BASE`, reads a token ad hoc from user state and joins room by arbitrary ID. | Use one authenticated, allowed-origin realtime configuration with verified room membership/token refresh and test reconnect/revocation behavior. |
| **P1** | Patient intake uses emoji/text badges and only Arabic/English clinical/payment copy | Consultation type and payment are expressed in hard-coded emoji strings and not six-language/accessible format. | Replace with accessible vector badges/status semantics and reviewed AR/EN/UR/HI/BN/FIL locale keys/RTL-LTR layouts. |
| **P1** | SOS dispatch remains reachable from doctor dashboard | Alert action routes directly to SOS dispatch while related governance remains unapproved. | Keep SOS/location/QR strictly fail-closed pending owner legal/product approval. |

## Decision

Doctor consultation reception is **FIX/BLOCKED**. Cash and insurance UI can state operational/financial success without a server-authoritative transaction or decision, and realtime/error behavior is not yet safe for provider operations.
