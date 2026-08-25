# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/video/[id].tsx`
- **Member SHA-256:** `bd03b73e7e3ee293f5bf096ec35b33f488fdf4e75d16b76e46caf6f2574faf60`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // Legacy route — the real LiveKit video room is /consultations/video-call.`
- `4: import { Redirect, useLocalSearchParams } from "expo-router";`
- `7: return <Redirect href={{ pathname: "/consultations/video-call", params: { sessionId: params.id } }} />;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: return <Redirect href={{ pathname: "/consultations/video-call", params: { sessionId: params.id } }} />;`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
