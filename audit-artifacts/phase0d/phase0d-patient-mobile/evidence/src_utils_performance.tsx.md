# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/performance.tsx`
- **Member SHA-256:** `91d2ce95d592780ca1414e1d287111517b95de4c3a190a16c8ed4a50da4793a5`
- **Line count:** 155
- **Read range:** `1-155`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `51: page: number;`
- `52: pageSize: number;`
- `53: totalPages: number;`
- `58: export function createPaginationState<T>(pageSize = 20): PaginationState<T> {`
- `61: page: 1,`
- `62: pageSize,`
- `63: totalPages: 1,`
- `76: ): T & { cancel: () => void } {`
- `84: debounced.cancel = () => {`
- `88: return debounced as T & { cancel: () => void };`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: ViewToken,`
### state_transitions
- `49: export interface PaginationState<T> {`
- `54: isLoading: boolean;`
- `58: export function createPaginationState<T>(pageSize = 20): PaginationState<T> {`
- `64: isLoading: false,`
- `76: ): T & { cancel: () => void } {`
- `84: debounced.cancel = () => {`
- `88: return debounced as T & { cancel: () => void };`
### payment_insurance_relevance
- `53: totalPages: number;`
- `63: totalPages: 1,`
### error_empty_loading_retry_cancel
- `54: isLoading: boolean;`
- `64: isLoading: false,`
- `76: ): T & { cancel: () => void } {`
- `77: let timeoutId: ReturnType<typeof setTimeout> | null = null;`
- `80: if (timeoutId) clearTimeout(timeoutId);`
- `81: timeoutId = setTimeout(() => func(...args), delay);`
- `84: debounced.cancel = () => {`
- `85: if (timeoutId) clearTimeout(timeoutId);`
- `88: return debounced as T & { cancel: () => void };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
