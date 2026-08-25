# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `utils/api.ts`
- **Member SHA-256:** `edb0a03ae75895681de9bac2e33373f34be9a6595058c35ca040cac4571cbb90`
- **Line count:** 120
- **Read range:** `1-120`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: * so all 157 screens that were wired to the mock become live against the real`
- `11: * backend without per-screen rewrites.`
- `15: *  - `options.body` may be a JSON string (screens already JSON.stringify) or an object.`
- `16: *  - Returns the parsed response body directly (screens read res.data / arrays / res.token).`
- `39: try { await secureDelete(key); } catch { /* best-effort logout cleanup */ }`
- `102: /** Store the session tokens after a successful login/register. */`
### backend_consumers_or_contracts
- `9: * The exported signature is intentionally unchanged (`apiFetch(endpoint, options)`)`
### auth_ownership
- `14: *  - Injects the JWT from secure storage as `Authorization: Bearer <token>`.`
- `16: *  - Returns the parsed response body directly (screens read res.data / arrays / res.token).`
- `17: *  - On 401: clears the stored session so the app falls back to the auth flow.`
- `21: const TOKEN_KEYS = [STORAGE_KEYS.AUTH_TOKEN, 'userToken'];`
- `23: async function getStoredToken(): Promise<string | null> {`
- `24: for (const key of TOKEN_KEYS) {`
- `26: const token = await secureGet(key);`
- `27: if (token) return token;`
- `30: // to plaintext AsyncStorage token retrieval.`
- `37: async function clearStoredSession(): Promise<void> {`
- `38: for (const key of [...TOKEN_KEYS, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA]) {`
- `39: try { await secureDelete(key); } catch { /* best-effort logout cleanup */ }`
### state_transitions
- `18: *  - Throws Error with the server's message when available — no silent fake fallbacks.`
- `52: function normalizeError(err: any): Error {`
- `55: err?.response?.data?.error ||`
- `58: return new Error(Array.isArray(serverMessage) ? serverMessage.join('، ') : String(serverMessage));`
- `60: if (err?.response?.status === 404) return new Error('العنصر المطلوب غير موجود');`
- `61: if (err?.response?.status === 429) return new Error('محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة');`
- `62: if (err?.response?.status >= 500) return new Error('خطأ في الخادم — حاول مرة أخرى لاحقًا');`
- `63: if (!err?.response && err?.request) return new Error('لا يوجد اتصال بالإنترنت — تحقق من الشبكة');`
- `64: return new Error(err?.message || 'حدث خطأ غير متوقع');`
- `95: if (err?.response?.status === 401 && !options.skipAuth) {`
- `98: throw normalizeError(err);`
- `102: /** Store the session tokens after a successful login/register. */`
### payment_insurance_relevance
- `103: export async function storeAuthSession(tokenPayload: any): Promise<string | null> {`
- `105: typeof tokenPayload === 'string' ? tokenPayload : tokenPayload?.accessToken || null;`
- `107: typeof tokenPayload === 'object' ? tokenPayload?.refreshToken : undefined;`
### error_empty_loading_retry_cancel
- `18: *  - Throws Error with the server's message when available — no silent fake fallbacks.`
- `28: } catch {`
- `39: try { await secureDelete(key); } catch { /* best-effort logout cleanup */ }`
- `49: timeout?: number;`
- `52: function normalizeError(err: any): Error {`
- `55: err?.response?.data?.error ||`
- `58: return new Error(Array.isArray(serverMessage) ? serverMessage.join('، ') : String(serverMessage));`
- `60: if (err?.response?.status === 404) return new Error('العنصر المطلوب غير موجود');`
- `61: if (err?.response?.status === 429) return new Error('محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة');`
- `62: if (err?.response?.status >= 500) return new Error('خطأ في الخادم — حاول مرة أخرى لاحقًا');`
- `63: if (!err?.response && err?.request) return new Error('لا يوجد اتصال بالإنترنت — تحقق من الشبكة');`
- `64: return new Error(err?.message || 'حدث خطأ غير متوقع');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
