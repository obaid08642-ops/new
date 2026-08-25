# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/emergency/sos.tsx`
- **Member SHA-256:** `e3cabb52b1e19a80f2743eb818dbe28979b35070b173c4fa477ae5b87b00f382`
- **Line count:** 315
- **Read range:** `1-315`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `30: export default function EmergencySOSScreen() {`
- `40: { text: "إلغاء", style: "cancel" },`
- `44: onPress: async () => {`
- `67: router.push({`
- `107: onPress={() => router.back()}`
- `117: onPress={handleSOS}`
- `177: onPress={() => callNumber(item.number)}`
- `206: onPress={() => router.push("/emergency/tracking" as never)}`
- `234: onPress={() => callNumber(EMERGENCY_NUMBERS.poison)}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `48: await Location.requestForegroundPermissionsAsync();`
### state_transitions
- `2: import React, { useState, useCallback } from "react";`
- `7: StatusBar,`
- `33: const [isSending, setIsSending] = useState(false);`
- `40: { text: "إلغاء", style: "cancel" },`
- `47: let { status } =`
- `50: if (status === "granted") {`
- `75: console.log("Error triggering SOS:", err);`
- `94: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `17: import { AppText, Card, IconButton } from "../../src/components/ui";`
- `179: st.callCard,`
- `205: <Card`
- `225: </Card>`
- `236: st.poisonCard,`
- `284: callCard: {`
- `307: poisonCard: {`
### error_empty_loading_retry_cancel
- `40: { text: "إلغاء", style: "cancel" },`
- `74: } catch (err) {`
- `75: console.log("Error triggering SOS:", err);`
- `87: Linking.openURL(`tel:${number}`).catch((_err) => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
