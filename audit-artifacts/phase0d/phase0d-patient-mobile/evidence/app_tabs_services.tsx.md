# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/services.tsx`
- **Member SHA-256:** `d481cd70486f95736262df9376562f8cbde45220c0e1303f4f3c72fecab2ef26`
- **Line count:** 220
- **Read range:** `1-220`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `15: route: string;`
- `25: route: "/(tabs)/diagnostics",`
- `32: route: "/(tabs)/nursing",`
- `40: route: "/diagnostics/packages",`
- `47: route: "/maternity/pregnancy-tracker",`
- `57: route: "/emergency/sos",`
- `64: route: "/consultations/specialty-select",`
- `71: route: "/consultations/specialty-select",`
- `78: route: "/mental-health/hub",`
- `85: route: "/nutrition/hub",`
- `92: route: "/(tabs)/nursing",`
### backend_consumers_or_contracts
- `32: route: "/(tabs)/nursing",`
- `92: route: "/(tabs)/nursing",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import { View, StyleSheet, ScrollView, StatusBar } from "react-native";`
- `103: <StatusBar barStyle="light-content" />`
- `143: style={[st.badge, { backgroundColor: colors.success }]}`
### payment_insurance_relevance
- `9: import { AppText, Card, SectionHeader } from "../../src/components/ui";`
- `116: {/* Main services — large cards */}`
- `120: <Card`
- `156: </Card>`
- `166: <Card`
- `169: style={[st.gridCard]}`
- `187: </Card>`
- `212: gridCard: { width: "47%", alignItems: "center", gap: 6, paddingVertical: 16 },`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
