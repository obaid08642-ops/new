# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/privacy.tsx`
- **Member SHA-256:** `6b675764d848138498d6f73c76e836da38fef810e9072cabd808e1fefe930abb`
- **Line count:** 231
- **Read range:** `1-231`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `26: export default function PrivacySettingsScreen() {`
- `95: <TouchableOpacity onPress={() => router.back()}>`
- `153: onPress={() => {`
- `158: { text: 'إلغاء', style: 'cancel' },`
- `162: onPress: async () => {`
### backend_consumers_or_contracts
- `47: apiFetch('/users/me/privacy-settings', {`
- `164: await apiFetch('/support/requests', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useEffect } from "react";`
- `30: const [settings, setSettings] = useState({`
- `158: { text: 'إلغاء', style: 'cancel' },`
### payment_insurance_relevance
- `18: Card,`
- `102: <View style={[styles.infoCard, { backgroundColor: "#EBF3FF" }]}>`
- `119: styles.card,`
- `198: infoCard: { borderRadius: 14, padding: 12 },`
- `206: card: {`
### error_empty_loading_retry_cancel
- `41: .catch(() => {});`
- `50: }).catch(() => {});`
- `158: { text: 'إلغاء', style: 'cancel' },`
- `173: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
