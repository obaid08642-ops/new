# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/web_pages_files.txt`
- **Member SHA-256:** `e93431f142d8579cc77678bfe7aaacbc85265beeebfc4829c9b50a203cc4784d`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: [locale]/appointments/[appointmentId]/page.tsx`
- `2: [locale]/appointments/page.tsx`
- `3: [locale]/articles/[slug]/page.tsx`
- `4: [locale]/articles/bookmarks/page.tsx`
- `5: [locale]/articles/page.tsx`
- `6: [locale]/cart/checkout/page.tsx`
- `7: [locale]/cart/page.tsx`
- `8: [locale]/cart/prescription/page.tsx`
- `9: [locale]/chat/[threadId]/page.tsx`
- `10: [locale]/chat/page.tsx`
- `11: [locale]/consultations/doctors/[doctorId]/page.tsx`
- `12: [locale]/consultations/doctors/page.tsx`
### backend_consumers_or_contracts
- `1: [locale]/appointments/[appointmentId]/page.tsx`
- `2: [locale]/appointments/page.tsx`
- `16: [locale]/diagnostics/labs/page.tsx`
- `20: [locale]/diagnostics/radiology/page.tsx`
- `31: [locale]/home-care/page.tsx`
- `32: [locale]/home-care/services/[serviceId]/page.tsx`
- `33: [locale]/home-care/services/page.tsx`
- `34: [locale]/insurance/page.tsx`
- `44: [locale]/notifications/page.tsx`
- `45: [locale]/notifications/settings/page.tsx`
- `46: [locale]/orders/[orderId]/page.tsx`
- `47: [locale]/orders/[orderId]/tracking/page.tsx`
### auth_ownership
- `35: [locale]/login/page.tsx`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `34: [locale]/insurance/page.tsx`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
