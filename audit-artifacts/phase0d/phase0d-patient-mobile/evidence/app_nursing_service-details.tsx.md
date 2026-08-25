# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nursing/service-details.tsx`
- **Member SHA-256:** `dde79b00f2c7dba8fa139eed7978945fea09e3d31b54b4522a38972f30127d5b`
- **Line count:** 287
- **Read range:** `1-287`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter, useLocalSearchParams } from 'expo-router';`
- `20: const router = useRouter();`
- `28: // Pre-Booking Lock (Injection Policy)`
- `61: <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>`
- `85: <TouchableOpacity activeOpacity={0.7} style={styles.quickFilter} onPress={() => setSortVisible(true)}>`
- `145: onPress={() => {`
- `151: router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: nurse.id, flow, serviceId } });`
- `167: <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setSortVisible(false)}>`
- `173: <TouchableOpacity onPress={() => handleSortChange('any')}>`
- `179: <TouchableOpacity style={styles.sortOption} onPress={() => handleSortChange('nearest')}>`
- `186: <TouchableOpacity style={styles.sortOption} onPress={() => handleSortChange('highest_rated')}>`
- `191: <TouchableOpacity style={styles.closeBtn} onPress={() => setSortVisible(false)}>`
### backend_consumers_or_contracts
- `35: const res = await apiFetch(`/home-care/providers?type=${serviceId}&sort=${sortType}&gender=${gender || "any"}&availability=${availability || "any"}&nationality=${nationality || "any"}&search=${search || ""}`);`
- `151: router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: nurse.id, flow, serviceId } });`
- `216: router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: selectedNurseForLock, flow, serviceId } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `23: const [nurses, setNurses] = useState<any[]>([]);`
- `24: const [loading, setLoading] = useState(true);`
- `25: const [sortVisible, setSortVisible] = useState(false);`
- `26: const [currentSort, setCurrentSort] = useState('nearest');`
- `29: const [lockVisible, setLockVisible] = useState(false);`
- `30: const [selectedNurseForLock, setSelectedNurseForLock] = useState<any>(null);`
- `33: setLoading(true);`
- `38: console.error(err);`
- `40: setLoading(false);`
- `91: {loading ? (`
### payment_insurance_relevance
- `69: {/* PREMIUM TOP CARD (No Emojis) */}`
- `95: <View key={nurse.id} style={styles.card}>`
- `96: <View style={styles.cardRow}>`
- `135: {nurse.price != null ? (`
- `136: <LocalizedText style={styles.priceText}>{nurse.price} <LocalizedText style={styles.currency}>ر.س</LocalizedText></LocalizedText>`
- `138: <LocalizedText style={styles.priceText}><LocalizedText style={styles.currency}>يُحدد عند الحجز</LocalizedText></LocalizedText>`
- `254: card: { backgroundColor: 'transparent', marginHorizontal: 20, marginBottom: 20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shado`
- `255: cardRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },`
- `269: priceText: { fontFamily: 'Cairo-Bold', fontSize: 24, color: '#0F172A' },`
### error_empty_loading_retry_cancel
- `24: const [loading, setLoading] = useState(true);`
- `33: setLoading(true);`
- `37: } catch (err) {`
- `38: console.error(err);`
- `40: setLoading(false);`
- `91: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
