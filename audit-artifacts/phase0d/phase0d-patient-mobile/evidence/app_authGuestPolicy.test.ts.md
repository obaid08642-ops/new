# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/authGuestPolicy.test.ts`
- **Member SHA-256:** `ec4c298c50893080e50ac11c2499425751b75e3cd0302a7bc847125c45269bc4`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: expect(source).not.toContain('guestLogin(');`
### backend_consumers_or_contracts
- `14: expect(source).not.toContain('/auth/guest');`
### auth_ownership
- `5: it('does not invoke the legacy guest endpoint or restore guest sessions from app entry points', () => {`
- `15: expect(source).not.toContain('guestLogin(');`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
