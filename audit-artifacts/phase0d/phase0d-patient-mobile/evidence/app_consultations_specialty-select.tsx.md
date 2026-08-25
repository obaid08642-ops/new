# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/specialty-select.tsx`
- **Member SHA-256:** `cf4c31f5c0af14199dcb0b04e55056ad977d3e951780585906f5f502bf9603b8`
- **Line count:** 131
- **Read range:** `1-131`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `19: export default function SpecialtySelectScreen() {`
- `55: <IconButton icon="back" onPress={() => router.back()} />`
- `75: <AppText variant="labelMD" color={colors.primary} onPress={loadSpecs}>إعادة المحاولة</AppText>`
- `85: onPress={() =>`
- `86: router.push({`
### backend_consumers_or_contracts
- `28: apiFetch('/care/specialties')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `8: StatusBar,`
- `22: const [q, setQ] = useState("");`
- `23: const [specs, setSpecs] = useState<any[]>([]);`
- `24: const [loadError, setLoadError] = useState(false);`
- `27: setLoadError(false);`
- `34: .catch(() => { setSpecs([]); setLoadError(true); });`
- `43: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `72: {loadError ? 'تعذر تحميل التخصصات. تحقق من اتصالك.' : 'لا توجد تخصصات مطابقة'}`
- `74: {loadError && (`
### payment_insurance_relevance
- `14: import { AppText, Card, Input, IconButton } from "../../src/components/ui";`
- `83: <Card`
- `107: </Card>`
### error_empty_loading_retry_cancel
- `24: const [loadError, setLoadError] = useState(false);`
- `27: setLoadError(false);`
- `34: .catch(() => { setSpecs([]); setLoadError(true); });`
- `72: {loadError ? 'تعذر تحميل التخصصات. تحقق من اتصالك.' : 'لا توجد تخصصات مطابقة'}`
- `74: {loadError && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
