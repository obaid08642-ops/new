# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/loyalty/leaderboard.tsx`
- **Member SHA-256:** `337510aae0d6d2c49f26c78adffe3326fc025ab31295cb3eac1cd302c1001340`
- **Line count:** 293
- **Read range:** `1-293`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `27: export default function LeaderboardScreen() {`
- `80: onPress={() => router.back()}`
### backend_consumers_or_contracts
- `36: apiFetch('/loyalty/leaderboard?limit=50')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `31: const [LEADERS, setLeaders] = React.useState<any[]>([]);`
- `32: const [loadingLb, setLoadingLb] = React.useState(true);`
- `50: .finally(() => setLoadingLb(false));`
- `85: {loadingLb && (`
- `90: {!loadingLb && LEADERS.length === 0 && (`
- `95: {!loadingLb && hasTop3 && (`
### payment_insurance_relevance
- `12: Card,`
### error_empty_loading_retry_cancel
- `32: const [loadingLb, setLoadingLb] = React.useState(true);`
- `49: .catch(() => setLeaders([]))`
- `50: .finally(() => setLoadingLb(false));`
- `85: {loadingLb && (`
- `90: {!loadingLb && LEADERS.length === 0 && (`
- `95: {!loadingLb && hasTop3 && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
