# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/components/DoctorUrgentRequests.tsx`
- **Member SHA-256:** `b76547430d1b27230e84b9e0730154742179ba2a4f7e7ec9a4c46cf4c9cd09b4`
- **Line count:** 108
- **Read range:** `1-108`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `55: onPress={() => onAccept(item)}`
- `62: onPress={() => onDecline(item.id)}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `4: import { NCard, NBtn, NBadge } from '../../../components/ui';`
- `44: <NCard style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.danger }]}>`
- `68: </NCard>`
- `89: card: {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
