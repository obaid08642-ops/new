# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/call-history.tsx`
- **Member SHA-256:** `acf319e53b7eedb3359d1c3d94864b67a3124ea9403f705c577f93732c022f4c`
- **Line count:** 355
- **Read range:** `1-355`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `32: export default function CallHistoryScreen() {`
- `42: const [page, setPage] = useState(1);`
- `45: const fetchHistory = async (pageNum: number, isRefresh = false) => {`
- `47: if (pageNum === 1 && !isRefresh) setLoading(true);`
- `48: const data = await apiFetch(`/calls/history?page=${pageNum}&limit=20`);`
- `50: if (isRefresh || pageNum === 1) {`
- `71: setPage(1);`
- `77: const nextPage = page + 1;`
- `78: setPage(nextPage);`
- `79: fetchHistory(nextPage);`
- `87: router.push({`
### backend_consumers_or_contracts
- `48: const data = await apiFetch(`/calls/history?page=${pageNum}&limit=20`);`
### auth_ownership
- `19: interface CallSession {`
- `39: const [calls, setCalls] = useState<CallSession[]>([]);`
- `41: const [refreshing, setRefreshing] = useState(false);`
- `45: const fetchHistory = async (pageNum: number, isRefresh = false) => {`
- `47: if (pageNum === 1 && !isRefresh) setLoading(true);`
- `50: if (isRefresh || pageNum === 1) {`
- `61: setRefreshing(false);`
- `69: const handleRefresh = () => {`
- `70: setRefreshing(true);`
- `83: const handleRedial = (item: CallSession) => {`
- `138: const renderItem = ({ item }: { item: CallSession }) => {`
- `275: refreshing={refreshing}`
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `6: StatusBar,`
- `25: status: "pending" | "active" | "ended" | "missed" | "rejected";`
- `35: const currentUser = useSelector((state: any) => state.auth.user) || {`
- `39: const [calls, setCalls] = useState<CallSession[]>([]);`
- `40: const [loading, setLoading] = useState(true);`
- `41: const [refreshing, setRefreshing] = useState(false);`
- `42: const [page, setPage] = useState(1);`
- `43: const [hasMore, setHasMore] = useState(true);`
- `47: if (pageNum === 1 && !isRefresh) setLoading(true);`
- `60: setLoading(false);`
- `76: if (!loading && hasMore) {`
### payment_insurance_relevance
- `55: setHasMore(calls.length + data.calls.length < data.total);`
- `147: st.card,`
- `154: <View style={st.cardHeader}>`
- `191: <View style={[st.cardFooter, { borderTopColor: colors.borderLight }]}>`
- `318: card: {`
- `323: cardHeader: {`
- `347: cardFooter: {`
### error_empty_loading_retry_cancel
- `25: status: "pending" | "active" | "ended" | "missed" | "rejected";`
- `40: const [loading, setLoading] = useState(true);`
- `47: if (pageNum === 1 && !isRefresh) setLoading(true);`
- `57: } catch (err) {`
- `60: setLoading(false);`
- `76: if (!loading && hasMore) {`
- `132: return colors.error || "#F0695C";`
- `236: {loading ? (`
- `244: st.emptyIconWrap,`
- `310: emptyIconWrap: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
