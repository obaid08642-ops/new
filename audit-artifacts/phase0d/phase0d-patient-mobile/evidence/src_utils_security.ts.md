# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/security.ts`
- **Member SHA-256:** `4079f56a207b6c84715ee58b423746b152ed579af84952f1bf6335132a112a00`
- **Line count:** 170
- **Read range:** `1-170`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `103: // Social Login Data Cleaning`
- `106: export interface SocialLoginData {`
- `113: export function cleanSocialLoginData(data: SocialLoginData): SocialLoginData {`
- `127: | 'LOGIN_SUCCESS'`
- `128: | 'LOGIN_FAILED'`
- `129: | 'LOGOUT'`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: // fallback for session or patient data; it is retained only for web-only,`
- `94: // Token Management`
- `97: export function isTokenExpired(expiryTimestamp: number | null): boolean {`
- `103: // Social Login Data Cleaning`
- `106: export interface SocialLoginData {`
- `113: export function cleanSocialLoginData(data: SocialLoginData): SocialLoginData {`
- `127: | 'LOGIN_SUCCESS'`
- `128: | 'LOGIN_FAILED'`
- `129: | 'LOGOUT'`
- `130: | 'TOKEN_REFRESH'`
- `134: | 'CHAT_SESSION_START'`
- `135: | 'CHAT_SESSION_END'`
### state_transitions
- `11: export class SecureStorageUnavailableError extends Error {`
- `23: throw new SecureStorageUnavailableError();`
- `32: throw new SecureStorageUnavailableError();`
- `44: throw new SecureStorageUnavailableError();`
- `127: | 'LOGIN_SUCCESS'`
- `128: | 'LOGIN_FAILED'`
- `137: | 'PAYMENT_COMPLETED'`
- `138: | 'PAYMENT_FAILED'`
### payment_insurance_relevance
- `136: | 'PAYMENT_INITIATED'`
- `137: | 'PAYMENT_COMPLETED'`
- `138: | 'PAYMENT_FAILED'`
### error_empty_loading_retry_cancel
- `11: export class SecureStorageUnavailableError extends Error {`
- `22: } catch {`
- `23: throw new SecureStorageUnavailableError();`
- `31: } catch {`
- `32: throw new SecureStorageUnavailableError();`
- `43: } catch {`
- `44: throw new SecureStorageUnavailableError();`
- `47: try { await AsyncStorage.removeItem(key); } catch {}`
- `128: | 'LOGIN_FAILED'`
- `138: | 'PAYMENT_FAILED'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
