# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/meditation.test.ts`
- **Member SHA-256:** `5ac66939db5d6b742747f97ae9e8cdf7198682ed1d0720b10e15f16a0811c1ef`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: describe('meditation history response guards',()=>{it('keeps activity metadata and drops ownership fields',()=>{expect(parseMeditationHistory([{id:'s1',patient_id:'private',type:'breathing',duration_minutes:10,completed:true,logged_at:'2026`
### state_transitions
- `3: describe('meditation history response guards',()=>{it('keeps activity metadata and drops ownership fields',()=>{expect(parseMeditationHistory([{id:'s1',patient_id:'private',type:'breathing',duration_minutes:10,completed:true,logged_at:'2026`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
