# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/offer/[id].tsx`
- **Member SHA-256:** `c5b964f782a7b227134183a14c9197ebfa1475c3dfe2cd05eeeee13260800673`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: // E2: this screen was fully broken — `promos` was a hardcoded empty array so`
- `4: // `offer[2]` crashed on render, `providers` was undefined, and the book button`
- `5: // pointed at a non-existent route. The real offer experience lives in`
- `8: import { Redirect, useLocalSearchParams } from 'expo-router';`
- `12: return <Redirect href={{ pathname: '/offers/[id]', params: { id: String(id ?? '') } }} />;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: // E2: this screen was fully broken — `promos` was a hardcoded empty array so`
### payment_insurance_relevance
- `2: // app/consultations/offer/[id].tsx`
- `4: // `offer[2]` crashed on render, `providers` was undefined, and the book button`
- `5: // pointed at a non-existent route. The real offer experience lives in`
- `6: // /offers/[id] (fetches /offers/:id from the backend). Redirect there.`
- `10: export default function ConsultationOfferRedirect() {`
- `12: return <Redirect href={{ pathname: '/offers/[id]', params: { id: String(id ?? '') } }} />;`
### error_empty_loading_retry_cancel
- `3: // E2: this screen was fully broken — `promos` was a hardcoded empty array so`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
