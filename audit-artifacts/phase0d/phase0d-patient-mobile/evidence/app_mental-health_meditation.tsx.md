# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/mental-health/meditation.tsx`
- **Member SHA-256:** `98f11b145564e23271bb11d784d5ef6ef47e19036edae5ccb033dbbfed8263ea`
- **Line count:** 6
- **Read range:** `1-6`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: import { Redirect } from 'expo-router';`
- `5: return <Redirect href="/mental-health/hub" />;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: /** Guided meditation content is deferred until it is clinically reviewed, fully localized, and backed by truthful session content. */`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
