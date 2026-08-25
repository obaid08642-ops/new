# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/upload-rx.tsx`
- **Member SHA-256:** `1bf443704c5aa1480f8a9bb1e196c82a3a42ed8b181d62df7a4c20bc18149fa2`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // Legacy route — prescription scanning/upload lives in /pharmacy/scan-prescription.`
- `3: // This file previously rendered a bare "Upload" placeholder stub.`
- `4: import { Redirect } from "expo-router";`
- `6: return <Redirect href="/pharmacy/scan-prescription" />;`
### backend_consumers_or_contracts
- `2: // Legacy route — prescription scanning/upload lives in /pharmacy/scan-prescription.`
- `6: return <Redirect href="/pharmacy/scan-prescription" />;`
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
