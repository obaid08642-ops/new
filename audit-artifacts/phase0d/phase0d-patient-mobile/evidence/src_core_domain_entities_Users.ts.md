# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/domain/entities/Users.ts`
- **Member SHA-256:** `5f125bccbc2eb6aa0e7be583f671b6b918ece9820f4ea2a825a2fbd52d3dc2a3`
- **Line count:** 84
- **Read range:** `1-84`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: export type UserRole = 'guest' | 'patient' | 'doctor' | 'pharmacy' | 'nurse' | 'lab' | 'admin' | 'insurance';`
- `19: role: UserRole;`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `13: export type UserRole = 'guest' | 'patient' | 'doctor' | 'pharmacy' | 'nurse' | 'lab' | 'admin' | 'insurance';`
- `81: export interface Insurance extends Provider {`
- `83: coverageNetworks: string[];`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
