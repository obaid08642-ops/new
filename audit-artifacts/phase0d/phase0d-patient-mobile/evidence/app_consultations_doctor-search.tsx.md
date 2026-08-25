# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/doctor-search.tsx`
- **Member SHA-256:** `7306994dbce3ae1443f7fd9d3cba515436b05fc9b8695abdf3fdfe8905378d77`
- **Line count:** 246
- **Read range:** `1-246`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router, useLocalSearchParams } from "expo-router";`
- `29: export default function DoctorSearchScreen() {`
- `106: <IconButton icon="back" onPress={() => router.back()} />`
- `136: onPress={() => setSort(k)}`
- `178: onPress={() =>`
- `179: router.push({`
- `184: onBook={() =>`
- `185: router.push({`
- `186: pathname: "/consultations/book/[id]",`
- `238: bookBtn: {`
### backend_consumers_or_contracts
- `44: const res = await apiFetch(`/care/doctors?${qs.toString()}`);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect, useCallback } from "react";`
- `8: StatusBar,`
- `33: const [query, setQuery] = useState((params.specialty as string) || "");`
- `34: const [sort, setSort] = useState<"rating" | "price" | "wait">("rating");`
- `35: const [doctors, setDoctors] = useState<any[]>([]);`
- `36: const [loading, setLoading] = useState(true);`
- `40: setLoading(true);`
- `45: // E2: always set (empty search must clear old results) and never invent stats —`
- `70: setLoading(false);`
- `94: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `142: {loading ? (`
- `164: ListEmptyComponent={`
### payment_insurance_relevance
- `17: Card,`
- `22: DoctorCard,`
- `34: const [sort, setSort] = useState<"rating" | "price" | "wait">("rating");`
- `46: // rating/price/wait/exp/hospital stay null when the backend doesn't provide them`
- `56: price: d.consultation_fee ?? d.price ?? null,`
- `59: online: d.offers_online ?? false,`
- `60: clinic: d.offers_clinic ?? false,`
- `61: home: d.offers_home ?? false,`
- `62: ins: d.accepts_insurance ?? false,`
- `85: sort === "price"`
- `86: ? (a.price ?? Infinity) - (b.price ?? Infinity)`
- `128: ["price", "الأقل سعراً"],`
### error_empty_loading_retry_cancel
- `36: const [loading, setLoading] = useState(true);`
- `40: setLoading(true);`
- `45: // E2: always set (empty search must clear old results) and never invent stats —`
- `67: } catch {`
- `70: setLoading(false);`
- `142: {loading ? (`
- `164: ListEmptyComponent={`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
