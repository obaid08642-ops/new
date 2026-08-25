# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/entities/Clinical.ts`
- **Member SHA-256:** `214653779f0536483be58dc1a19896240d16834c3ede77e7d899cdba35aaed41`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `27: patientId: string;`
- `40: patientId: string;`
### state_transitions
- `32: status: 'active' | 'fulfilled' | 'expired';`
- `35: import { Appointment, AppointmentStatus, AppointmentMode } from '../../../types/contracts';`
### payment_insurance_relevance
- `15: price: Money;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
