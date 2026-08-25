# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/api/offlineHelpers.ts`
- **Member SHA-256:** `9fc3fdac61ccc20e5bd84e218e77bee292c1913bcb49ab45a42fabfbd5b22a8e`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `17: } catch (error: any) {`
- `18: // If it's a network error (no connection)`
- `19: if (error?.message === 'Network request failed' || error?.status === 0) {`
- `25: throw error;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: * RTK Query helper to wrap mutations with offline queue support.`
- `5: * If the device is offline, instead of failing, the action is queued.`
- `7: * Note: Actual offline queue execution is handled by `HttpClient.ts` (enqueueOfflineRequest).`
- `8: * This helper is for dispatching specific Redux actions when offline mutations happen.`
- `10: export const withOfflineSupport = async <T>(`
- `17: } catch (error: any) {`
- `18: // If it's a network error (no connection)`
- `19: if (error?.message === 'Network request failed' || error?.status === 0) {`
- `23: // Can also dispatch a generic 'offline/queued' action to show a toast`
- `25: throw error;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
