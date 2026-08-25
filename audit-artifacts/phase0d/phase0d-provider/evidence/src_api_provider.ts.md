# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/api/provider.ts`
- **Member SHA-256:** `5f30f4ee002b6db4c49df03b2c174959ceb66012e2ce039591873f5c4b02a09b`
- **Line count:** 102
- **Read range:** `1-102`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `28: /** Step 1.5: Login to obtain JWT token for subsequent steps */`
- `29: async login(phone: string, password?: string) {`
- `30: const res = await client.post('/auth/login', { phone, password });`
- `33: // token"), which is what broke document uploads during onboarding.`
- `49: /** Utility: Convert local URI to base64 and upload to Storage service */`
- `50: async uploadFile(uri: string, mimeType: string, originalName: string = 'file') {`
- `59: const res = await client.post('/storage/upload', {`
- `68: throw e; // Re-throw so callers can handle upload errors`
- `72: /** Utility: Upload base64 signature directly */`
- `73: async uploadSignature(base64Image: string) {`
- `75: const res = await client.post('/storage/upload', {`
- `97: /** Final Step: Submit for Admin Review */`
### backend_consumers_or_contracts
- `30: const res = await client.post('/auth/login', { phone, password });`
### auth_ownership
- `2: import { Tokens } from '../security/Security';`
- `8: * registration record so the admin review shows EVERY typed field.`
- `13: if (/pass|secret|token|signatureData/i.test(k)) continue;`
- `28: /** Step 1.5: Login to obtain JWT token for subsequent steps */`
- `29: async login(phone: string, password?: string) {`
- `30: const res = await client.post('/auth/login', { phone, password });`
- `31: // Backend returns { token: { accessToken, refreshToken } } — saving the`
- `32: // whole object as the bearer token made EVERY later call 401 ("Invalid`
- `33: // token"), which is what broke document uploads during onboarding.`
- `34: const t = res.data?.token;`
- `35: const accessToken = typeof t === 'string' ? t : (t?.accessToken || res.data?.access_token || '');`
- `36: const refreshToken = typeof t === 'object' && t ? (t.refreshToken || '') : (res.data?.refresh_token || '');`
### state_transitions
- `68: throw e; // Re-throw so callers can handle upload errors`
### payment_insurance_relevance
- `23: async start(payload: { phone: string; password?: string; full_name?: string; email?: string; type: string }) {`
- `24: const res = await client.post('/provider-onboarding/start', payload);`
- `86: async step2(payload: any) {`
- `87: const res = await client.post('/provider-onboarding/step2', payload);`
- `92: async step3(payload: any) {`
- `93: const res = await client.post('/provider-onboarding/step3', payload);`
- `98: async submit(payload?: any) {`
- `99: const res = await client.post('/provider-onboarding/submit', payload || {});`
### error_empty_loading_retry_cancel
- `67: } catch (e) {`
- `68: throw e; // Re-throw so callers can handle upload errors`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
