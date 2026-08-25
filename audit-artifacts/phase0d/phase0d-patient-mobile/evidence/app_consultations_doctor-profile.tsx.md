# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/doctor-profile.tsx`
- **Member SHA-256:** `733368cdc728552c33ceb88ccd57ebec9279c407b6b451c07e502e0f4aa5dd7f`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * Legacy route — canonical doctor profile lives at /consultations/doctor/[id].`
- `4: * This screen exists only to keep old links working (clinic page, map,`
- `9: import { router, useLocalSearchParams } from 'expo-router';`
- `20: router.replace(`/consultations/doctor/${doctorId}`);`
- `22: router.replace('/consultations/doctor-search');`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
