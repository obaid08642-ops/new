# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_ADDRESS_CREATE_REMEDIATION_TESTS_20260818.md`
- **Member SHA-256:** `789c21dad718e958668a9117449062b5158429b2359f2628389ffb66c26e4d7d`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The `إضافة عنوان جديد` action must open a real form and submit through `POST /users/me/addresses`. The form must validate the required address fields, show loading state, preserve entered data on recoverable failure, display a localized err`
- `15: | ADDR-05 | API 4xx/5xx | Error is visible, entered values remain, retry is possible |`
- `18: | ADDR-08 | Offline/timeout | Loading ends, localized retry state appears, no false success |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The `إضافة عنوان جديد` action must open a real form and submit through `POST /users/me/addresses`. The form must validate the required address fields, show loading state, preserve entered data on recoverable failure, display a localized err`
- `17: | ADDR-07 | Ownership | Another user cannot read or mutate the address |`
### state_transitions
- `5: The `إضافة عنوان جديد` action must open a real form and submit through `POST /users/me/addresses`. The form must validate the required address fields, show loading state, preserve entered data on recoverable failure, display a localized err`
- `12: | ADDR-02 | Empty submission | Client validation blocks request and identifies required fields |`
- `14: | ADDR-04 | Success | New address appears in list and can be selected as default |`
- `15: | ADDR-05 | API 4xx/5xx | Error is visible, entered values remain, retry is possible |`
- `18: | ADDR-08 | Offline/timeout | Loading ends, localized retry state appears, no false success |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: The `إضافة عنوان جديد` action must open a real form and submit through `POST /users/me/addresses`. The form must validate the required address fields, show loading state, preserve entered data on recoverable failure, display a localized err`
- `12: | ADDR-02 | Empty submission | Client validation blocks request and identifies required fields |`
- `15: | ADDR-05 | API 4xx/5xx | Error is visible, entered values remain, retry is possible |`
- `18: | ADDR-08 | Offline/timeout | Loading ends, localized retry state appears, no false success |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
