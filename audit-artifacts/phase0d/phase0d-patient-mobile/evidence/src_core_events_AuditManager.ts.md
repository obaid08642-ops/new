# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/events/AuditManager.ts`
- **Member SHA-256:** `3a3f343646e6cca632bdd38f0999ade8b9b53018118038f3af1d2e0ffd49015e`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: | 'USER_LOGIN'`
- `5: | 'LOGIN_FAILED'`
- `6: | 'USER_LOGOUT'`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: | 'USER_LOGIN'`
- `5: | 'LOGIN_FAILED'`
- `6: | 'USER_LOGOUT'`
- `11: | 'ROLE_CHANGED'`
### state_transitions
- `5: | 'LOGIN_FAILED'`
- `65: this.log.error('Failed to flush audit records, returning to queue', e);`
### payment_insurance_relevance
- `9: | 'PAYMENT_PROCESSED'`
### error_empty_loading_retry_cancel
- `5: | 'LOGIN_FAILED'`
- `64: } catch (e) {`
- `65: this.log.error('Failed to flush audit records, returning to queue', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
