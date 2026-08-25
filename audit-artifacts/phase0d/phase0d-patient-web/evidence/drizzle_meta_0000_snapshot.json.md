# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `drizzle/meta/0000_snapshot.json`
- **Member SHA-256:** `b9cbf8a3e952a8dd662aa3b7be06e0f995e771dea35842f674d259120a2f01c9`
- **Line count:** 110
- **Read range:** `1-110`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `38: "loginMethod": {`
- `39: "name": "loginMethod",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `38: "loginMethod": {`
- `39: "name": "loginMethod",`
- `45: "role": {`
- `46: "name": "role",`
- `47: "type": "enum('user','admin')",`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
