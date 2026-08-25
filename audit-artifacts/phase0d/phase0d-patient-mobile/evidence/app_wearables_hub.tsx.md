# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wearables/hub.tsx`
- **Member SHA-256:** `3f924a0d33e01e499f005922c920987175640c5404da4c4b0fe20cb3760afcd8`
- **Line count:** 269
- **Read range:** `1-269`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `103: export default function WearablesHubScreen() {`
- `169: onPress={() => router.back()}`
- `240: onPress={handleSave}`
### backend_consumers_or_contracts
- `34: apiFetch("/health/vitals", {`
- `47: apiFetch("/health/vitals", {`
- `69: apiFetch("/health/vitals", {`
- `82: apiFetch("/health/vitals", {`
- `95: apiFetch("/health/vitals", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `7: StatusBar,`
- `107: const [values, setValues] = useState({});`
- `108: const [saving, setSaving] = useState(false);`
- `109: const [savedMsg, setSavedMsg] = useState(false);`
- `149: console.error(err);`
- `158: <StatusBar barStyle="light-content" />`
- `223: <Card style={{ backgroundColor: colors.successSurface }}>`
- `227: <Icon name="check_circle" size={20} color={colors.success} />`
- `228: <AppText variant="bodySM" color={colors.success}>`
- `239: loading={saving}`
### payment_insurance_relevance
- `18: Card,`
- `177: <Card style={{ backgroundColor: colors.primarySurface }}>`
- `183: </Card>`
- `188: <Card`
- `217: </Card>`
- `223: <Card style={{ backgroundColor: colors.successSurface }}>`
- `232: </Card>`
### error_empty_loading_retry_cancel
- `148: } catch (err) {`
- `149: console.error(err);`
- `239: loading={saving}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
