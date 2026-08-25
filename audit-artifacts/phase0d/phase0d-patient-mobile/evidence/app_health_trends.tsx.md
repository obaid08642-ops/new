# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/trends.tsx`
- **Member SHA-256:** `a08673281a04cd407c8df123d835fc51b3ddea7a9bba44c272c56d154fa76a44`
- **Line count:** 679
- **Read range:** `1-679`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { router } from "expo-router";`
- `128: export default function HealthTrendsScreen() {`
- `160: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `203: onPress={() => {`
- `223: onPress={() => router.back()}`
- `265: onPress={() => setActiveVital(v.id)}`
- `350: onPress={() => setTimeFilter(f.key)}`
- `464: onPress={() => setActiveVital(v.id)}`
- `503: onPress={() => {`
### backend_consumers_or_contracts
- `141: const res = await apiFetch('/health/trends');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: import React, { useState } from "react";`
- `11: StatusBar,`
- `132: const [timeFilter, setTimeFilter] = useState("3m");`
- `133: const [activeVital, setActiveVital] = useState("glucose");`
- `135: const [vitalTrends, setVitalTrends] = useState<any[]>([]);`
- `136: const [loading, setLoading] = useState(true);`
- `144: console.error(err);`
- `146: setLoading(false);`
- `153: if (loading) return null;`
- `184: <StatusBar barStyle="light-content" />`
- `473: styles.miniStatus,`
- `667: miniStatus: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },`
### payment_insurance_relevance
- `21: Card,`
- `227: <Card`
- `241: </Card>`
- `282: styles.currentCard,`
- `373: styles.chartCard,`
- `445: styles.statCard,`
- `466: styles.miniCard,`
- `576: currentCard: {`
- `605: chartCard: {`
- `634: statCard: {`
- `650: miniCard: {`
### error_empty_loading_retry_cancel
- `136: const [loading, setLoading] = useState(true);`
- `143: } catch (err) {`
- `144: console.error(err);`
- `146: setLoading(false);`
- `153: if (loading) return null;`
- `213: }).catch(() => {});`
- `513: }).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
