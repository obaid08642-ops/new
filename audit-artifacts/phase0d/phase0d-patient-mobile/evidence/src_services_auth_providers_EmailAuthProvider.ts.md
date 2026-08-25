# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/auth/providers/EmailAuthProvider.ts`
- **Member SHA-256:** `323edd1a3c39db0a556107bf623d63386ddb4153fcbf5f05f26d6a82c8bedfa8`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: async login(credentials: { email?: string; phone?: string; password?: string }): Promise<AuthResult> {`
- `11: url: '/auth/login',`
- `37: async logout(): Promise<void> {`
- `40: url: '/auth/logout',`
- `44: // Ignore network errors on logout`
### backend_consumers_or_contracts
- `11: url: '/auth/login',`
- `40: url: '/auth/logout',`
### auth_ownership
- `8: async login(credentials: { email?: string; phone?: string; password?: string }): Promise<AuthResult> {`
- `11: url: '/auth/login',`
- `18: if (!data.access_token) {`
- `27: role: data.user.role || 'patient',`
- `29: session: {`
- `30: accessToken: data.access_token,`
- `31: refreshToken: data.refresh_token,`
- `37: async logout(): Promise<void> {`
- `40: url: '/auth/logout',`
- `44: // Ignore network errors on logout`
### state_transitions
- `16: const data = response.data.data || response.data; // Depending on wrapping`
- `19: throw new Error('Invalid credentials');`
- `44: // Ignore network errors on logout`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `16: const data = response.data.data || response.data; // Depending on wrapping`
- `19: throw new Error('Invalid credentials');`
- `43: } catch (e) {`
- `44: // Ignore network errors on logout`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
