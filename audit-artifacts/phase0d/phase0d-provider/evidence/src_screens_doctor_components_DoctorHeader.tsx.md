# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/components/DoctorHeader.tsx`
- **Member SHA-256:** `2540d7329cc4614d440f93f3af1052a9e1cdaa80152bd3c34b51570aba7c04fa`
- **Line count:** 79
- **Read range:** `1-79`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: onNavigate: (screen: string) => void;`
- `37: onPress={() => onNavigate('settings')}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `27: <Text style={[styles.userRole, { color: theme.textSub }]}>`
- `64: userRole: {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
