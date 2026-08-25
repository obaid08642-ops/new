# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/health.tsx`
- **Member SHA-256:** `2566ca913a46c198f6264f3d8b43394a81ab2675305fce63f9da2a3222781e05`
- **Line count:** 441
- **Read range:** `1-441`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `32: const QUICK: { icon: IconName; label: string; color: string; route: string }[] =`
- `38: route: "/health/vitals",`
- `44: route: "/health/medications",`
- `50: route: "/health/prescriptions",`
- `56: route: "/health/reports",`
- `62: route: "/health/family-hub",`
- `68: route: "/health/family-chat",`
- `74: route: "/health/smart-reminders",`
- `80: route: "/articles",`
- `86: route: "/loyalty/hub",`
- `92: export default function HealthScreen() {`
### backend_consumers_or_contracts
- `103: apiFetch("/health/vitals/summary").catch(() => null),`
- `104: apiFetch("/health/score").catch(() => null),`
- `105: apiFetch('/home/upcoming-appointment').catch(() => null)`
- `113: const waterRes = await apiFetch(`/nutrition/daily-summary?date=${new Date().toISOString().split("T")[0]}`).catch(() => null);`
- `314: onPress={() => router.push("/(tabs)/nursing")}`
- `343: onAction={() => router.push("/consultations/appointments")}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `95: const [vitals, setVitals] = useState<any[]>([]);`
- `96: const [scoreData, setScoreData] = useState<any>(null);`
- `97: const [upcomingAppt, setUpcomingAppt] = useState<any>(null);`
- `131: <StatusBar barStyle="light-content" />`
- `224: label={{ excellent: "ممتازة", good: "جيدة", fair: "مقبولة", needs_attention: "تحتاج انتباه" }[scoreData.status] || "—"}`
- `285: <Badge label={v.status} color={v.color} />`
### payment_insurance_relevance
- `25: Card,`
- `115: const waterGlasses = Math.round((waterRes?.total_water_ml ?? 0) / 250);`
- `185: <Card`
- `200: </Card>`
- `209: <Card`
- `248: </Card>`
- `266: <Card`
- `306: </Card>`
- `313: <Card`
- `336: </Card>`
- `345: <Card`
- `373: </Card>`
### error_empty_loading_retry_cancel
- `103: apiFetch("/health/vitals/summary").catch(() => null),`
- `104: apiFetch("/health/score").catch(() => null),`
- `105: apiFetch('/home/upcoming-appointment').catch(() => null)`
- `113: const waterRes = await apiFetch(`/nutrition/daily-summary?date=${new Date().toISOString().split("T")[0]}`).catch(() => null);`
- `124: } catch (e) {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
