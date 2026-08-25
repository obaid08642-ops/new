# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/emergency/tracking.tsx`
- **Member SHA-256:** `d0725354447c85244ebc40d469df997a63b4f3c003ec1df91a6457131d97debe`
- **Line count:** 148
- **Read range:** `1-148`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { router } from 'expo-router';`
- `14: const STEP_ICONS = { received: 'check_circle', assigned: 'emergency', en_route: 'location', arrived: 'hospital' };`
- `16: export default function AmbulanceTrackingScreen() {`
- `59: <Button title="رجوع" variant="outline" onPress={() => router.back()} />`
- `60: {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}`
- `73: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `92: {/* Live status only — a visual route map requires an explicit authorized route contract. */}`
- `127: <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:997')}>`
### backend_consumers_or_contracts
- `33: const res = await apiFetch('/emergency/tracking');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: import React, { useState, useEffect } from 'react';`
- `19: const [data, setData] = useState<any>(null);`
- `20: const [loading, setLoading] = useState(true);`
- `36: setData((prev) => prev ?? { active: false, error: true });`
- `38: setLoading(false);`
- `47: // Honest empty state — no active SOS for this patient`
- `48: if (!loading && (!data || data.active === false)) {`
- `53: {data?.error ? 'تعذر تحميل التتبع' : 'لا يوجد طلب إسعاف نشط'}`
- `56: {data?.error ? 'تحقق من الاتصال وحاول مجدداً' : 'عند إرسال طلب طوارئ ستتمكن من تتبع سيارة الإسعاف هنا لحظة بلحظة'}`
- `60: {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}`
- `92: {/* Live status only — a visual route map requires an explicit authorized route contract. */}`
- `93: <View style={styles.trackingStatus}>`
### payment_insurance_relevance
- `112: <View style={[styles.stepsCard, { paddingBottom: insets.bottom + 12 }]}>`
- `143: stepsCard: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 20, paddingTop: 16, gap: 0 },`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `35: } catch {`
- `36: setData((prev) => prev ?? { active: false, error: true });`
- `38: setLoading(false);`
- `47: // Honest empty state — no active SOS for this patient`
- `48: if (!loading && (!data || data.active === false)) {`
- `53: {data?.error ? 'تعذر تحميل التتبع' : 'لا يوجد طلب إسعاف نشط'}`
- `56: {data?.error ? 'تحقق من الاتصال وحاول مجدداً' : 'عند إرسال طلب طوارئ ستتمكن من تتبع سيارة الإسعاف هنا لحظة بلحظة'}`
- `60: {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
