# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase11-homecare-owner-probe.txt`
- **Member SHA-256:** `0ef2f594acd156c5627e77387124c75baf7b01f7c156fbc17ec4c1f8dad63d9b`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: x-download-options: noopen`
- `32: BODY_REDACTED={"message":"home_care_booking_not_found","error":"Not Found","statusCode":404}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: STATUS=404`
- `29: cf-cache-status: DYNAMIC`
- `30: nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}`
- `32: BODY_REDACTED={"message":"home_care_booking_not_found","error":"Not Found","statusCode":404}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `32: BODY_REDACTED={"message":"home_care_booking_not_found","error":"Not Found","statusCode":404}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
