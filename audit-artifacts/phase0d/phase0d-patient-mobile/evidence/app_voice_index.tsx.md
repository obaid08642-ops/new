# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/voice/index.tsx`
- **Member SHA-256:** `66fee3147af7b2e95d48845b350e23b4c9d7415db7de39e92f3064d93b59539e`
- **Line count:** 163
- **Read range:** `1-163`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `28: route: "/consultations/doctor-search",`
- `34: route: "/(tabs)/pharmacy",`
- `40: route: "/(tabs)/diagnostics",`
- `46: route: "/(tabs)/nursing",`
- `52: route: "/consultations/appointments",`
- `58: route: "/emergency/sos",`
- `63: export default function VoiceAssistantScreen() {`
- `83: onPress={() => router.back()}`
- `101: onPress={() => router.push(a.route)}`
### backend_consumers_or_contracts
- `34: route: "/(tabs)/pharmacy",`
- `46: route: "/(tabs)/nursing",`
- `52: route: "/consultations/appointments",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: StatusBar,`
- `69: <StatusBar barStyle="light-content" />`
- `109: borderColor: a.danger ? colors.error : "transparent",`
- `117: ? colors.errorSurface`
- `125: color={a.danger ? colors.error : colors.primary}`
### payment_insurance_relevance
- `19: Card,`
- `103: <Card`
- `135: </Card>`
### error_empty_loading_retry_cancel
- `109: borderColor: a.danger ? colors.error : "transparent",`
- `117: ? colors.errorSurface`
- `125: color={a.danger ? colors.error : colors.primary}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
