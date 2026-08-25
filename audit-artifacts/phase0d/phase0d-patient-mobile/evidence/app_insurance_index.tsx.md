# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/index.tsx`
- **Member SHA-256:** `14545ca352e5a30fb45ea67efcad9ee601caf4c62f325e58a0e2432c6e9ec279`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { Redirect } from "expo-router";`
- `6: return <Redirect href="/insurance/hub" />;`
### backend_consumers_or_contracts
- `6: return <Redirect href="/insurance/hub" />;`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `6: return <Redirect href="/insurance/hub" />;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
