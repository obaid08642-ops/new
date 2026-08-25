# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/api/otp.ts`
- **Member SHA-256:** `8d0cdd37a8b314585d6fc0f023e198d0dbdc96406f7e5054eded60ed686fbcea`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: * Backend: POST /provider/auth/send-otp  { email, purpose }`
- `6: *          POST /provider/auth/verify-email { email, code }`
- `10: const res = await client.post('/provider/auth/send-otp', {`
- `19: await client.post('/provider/auth/verify-email', {`
### auth_ownership
- `4: * Real email OTP for provider onboarding final submission.`
- `5: * Backend: POST /provider/auth/send-otp  { email, purpose }`
- `9: export async function sendEmailOtp(email: string) {`
- `10: const res = await client.post('/provider/auth/send-otp', {`
- `17: export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `24: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
