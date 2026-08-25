# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/api.ts`
- **Member SHA-256:** `c40362bce6e86836a5762c4c5e84f6f09cd42f251ba73ac1ab3cf082f87a6b9b`
- **Line count:** 118
- **Read range:** `1-118`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `64: // S4: bounded waits — a hanging request must never freeze a screen indefinitely.`
- `81: // S4: exactly ONE automatic retry, and only for idempotent GETs —`
- `82: // never replay mutations (booking/payment) blindly: the server may have`
- `83: // received the first attempt; replaying risks duplicate booking/payment.`
### backend_consumers_or_contracts
- `70: return await fetch(url, { ...options, headers, signal: ctrl.signal });`
- `78: response = await doFetch();`
- `86: try { response = await doFetch(); }`
### auth_ownership
- `20: async function clearLegacyTokenMirror(): Promise<void> {`
- `21: // Migration cleanup only: a token is never read from or written to AsyncStorage.`
- `22: try { await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch {}`
- `25: async function getToken(): Promise<string | null> {`
- `27: const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);`
- `28: if (token && token !== '[object Object]' && token.length > 10) return token;`
- `29: if (token) await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);`
- `30: await clearLegacyTokenMirror();`
- `33: await clearLegacyTokenMirror();`
- `38: async function saveToken(token: string): Promise<void> {`
- `39: if (typeof token !== 'string' || !token || token === '[object Object]') {`
- `40: await clearLegacyTokenMirror();`
### state_transitions
- `12: export class ApiContractError extends Error {`
- `41: throw new ApiContractError('secure_storage_unavailable');`
- `48: throw new ApiContractError('secure_storage_unavailable');`
- `81: // S4: exactly ONE automatic retry, and only for idempotent GETs —`
- `84: if (isGet && e?.name !== 'AbortError') {`
- `87: catch (e2: any) { throw new Error(e2?.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'OFFLINE_ERROR'); }`
- `89: throw new Error(e?.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'OFFLINE_ERROR');`
- `94: let errorMsg = 'api_error';`
- `97: const m = errData?.message ?? errData?.error ?? null;`
- `98: // NestJS validation errors return message as ARRAY; some endpoints return`
- `100: errorMsg = typeof m === 'string' ? m : (Array.isArray(m) ? m.join(', ') : (m ? JSON.stringify(m) : errorMsg));`
- `103: // Handle missing/invalid token or auth error`
### payment_insurance_relevance
- `82: // never replay mutations (booking/payment) blindly: the server may have`
- `83: // received the first attempt; replaying risks duplicate booking/payment.`
### error_empty_loading_retry_cancel
- `12: export class ApiContractError extends Error {`
- `22: try { await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch {}`
- `32: } catch {`
- `41: throw new ApiContractError('secure_storage_unavailable');`
- `46: } catch {`
- `48: throw new ApiContractError('secure_storage_unavailable');`
- `65: const REQUEST_TIMEOUT_MS = 20000;`
- `67: const ctrl = new AbortController();`
- `68: const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);`
- `72: clearTimeout(timer);`
- `79: } catch (e: any) {`
- `81: // S4: exactly ONE automatic retry, and only for idempotent GETs —`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
