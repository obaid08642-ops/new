# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/reports/hub.tsx`
- **Member SHA-256:** `1c530e071267b80b77603e77049f71aab6241c1dfdd2fc2e542e140e461a6efc`
- **Line count:** 281
- **Read range:** `1-281`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { router } from "expo-router";`
- `41: if (r.lab_booking_id) return "lab";`
- `42: if (r.radiology_booking_id) return "radiology";`
- `59: export default function ReportsHubScreen() {`
- `110: onPress={() => router.back()}`
- `143: onPress={() => setFilter(f.key)}`
- `154: <Button label="إعادة المحاولة" size="sm" full={false} onPress={() => { setLoading(true); load(); }} />`
- `178: onPress={() =>`
- `179: router.push({`
- `237: onPress={() =>`
- `238: router.push({`
- `250: onPress={() =>`
### backend_consumers_or_contracts
- `71: const res = await apiFetch("/medical-reports/mine?limit=100");`
### auth_ownership
- `14: RefreshControl,`
- `65: const [refreshing, setRefreshing] = useState(false);`
- `80: setRefreshing(false);`
- `122: refreshControl={`
- `123: <RefreshControl`
- `124: refreshing={refreshing}`
- `125: onRefresh={() => {`
- `126: setRefreshing(true);`
### state_transitions
- `5: // view-report never read. Now: real API, honest states, correct params.`
- `6: import React, { useState, useEffect, useCallback } from "react";`
- `11: StatusBar,`
- `62: const [filter, setFilter] = useState("all");`
- `63: const [reports, setReports] = useState<any[]>([]);`
- `64: const [loading, setLoading] = useState(true);`
- `65: const [refreshing, setRefreshing] = useState(false);`
- `66: const [error, setError] = useState(false);`
- `70: setError(false);`
- `75: console.error(e);`
- `76: setError(true);`
- `79: setLoading(false);`
### payment_insurance_relevance
- `22: Card,`
- `149: <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>`
- `155: </Card>`
- `159: <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>`
- `169: </Card>`
- `176: <Card`
- `258: </Card>`
### error_empty_loading_retry_cancel
- `54: } catch {`
- `64: const [loading, setLoading] = useState(true);`
- `66: const [error, setError] = useState(false);`
- `70: setError(false);`
- `74: } catch (e) {`
- `75: console.error(e);`
- `76: setError(true);`
- `79: setLoading(false);`
- `115: {loading ? (`
- `148: {error && (`
- `154: <Button label="إعادة المحاولة" size="sm" full={false} onPress={() => { setLoading(true); load(); }} />`
- `158: {!error && filtered.length === 0 && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
