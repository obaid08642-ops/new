# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ErrorBoundary.tsx`
- **Member SHA-256:** `3b0bdb7a19758fcd440138ccfb5f306b96836564f15d7c8c9663d7dd7417e972`
- **Line count:** 62
- **Read range:** `1-62`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: <div className="flex items-center justify-center min-h-screen p-8 bg-background">`
- `43: onClick={() => window.location.reload()}`
- `51: Reload Page`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: interface State {`
- `10: hasError: boolean;`
- `11: error: Error | null;`
- `14: class ErrorBoundary extends Component<Props, State> {`
- `17: this.state = { hasError: false, error: null };`
- `20: static getDerivedStateFromError(error: Error): State {`
- `21: return { hasError: true, error };`
- `25: if (this.state.hasError) {`
- `34: <h2 className="text-xl mb-4">An unexpected error occurred.</h2>`
- `38: {this.state.error?.stack}`
- `62: export default ErrorBoundary;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `10: hasError: boolean;`
- `11: error: Error | null;`
- `14: class ErrorBoundary extends Component<Props, State> {`
- `17: this.state = { hasError: false, error: null };`
- `20: static getDerivedStateFromError(error: Error): State {`
- `21: return { hasError: true, error };`
- `25: if (this.state.hasError) {`
- `34: <h2 className="text-xl mb-4">An unexpected error occurred.</h2>`
- `38: {this.state.error?.stack}`
- `62: export default ErrorBoundary;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
