# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/components/DoctorStatsRow.tsx`
- **Member SHA-256:** `9339a2b5a24a0186f4de4ce352b3dea1db289b96a127e8fc0d1981bcb5427df2`
- **Line count:** 61
- **Read range:** `1-61`
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
- `11: pendingCount: number;`
- `31: label={AR ? 'طلبات قيد الانتظار' : 'Pending Requests'}`
- `32: value={String(stats.pendingCount || 0)}`
- `41: color={theme.success}`
### payment_insurance_relevance
- `4: import { NStatCard } from '../../../components/ui';`
- `23: <NStatCard`
- `28: style={styles.card}`
- `30: <NStatCard`
- `35: style={styles.card}`
- `37: <NStatCard`
- `40: icon="wallet"`
- `42: style={styles.card}`
- `58: card: {`
### error_empty_loading_retry_cancel
- `11: pendingCount: number;`
- `31: label={AR ? 'طلبات قيد الانتظار' : 'Pending Requests'}`
- `32: value={String(stats.pendingCount || 0)}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
