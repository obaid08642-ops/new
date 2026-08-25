# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/emergency/sos-active.tsx`
- **Member SHA-256:** `a2295e0840ae95f46a7879e96b65ad4cada043a4138c35de97722b8d55f52d58`
- **Line count:** 207
- **Read range:** `1-207`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter } from 'expo-router';`
- `15: export default function SosActiveScreen() {`
- `16: const router = useRouter();`
- `64: const handleCancelSOS = () => {`
- `69: { text: 'تراجع', style: 'cancel' },`
- `73: onPress: async () => {`
- `79: await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });`
- `81: { text: 'حسناً', onPress: () => router.push('/(tabs)/index' as any) }`
- `100: <IconButton icon="close" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleCancelSOS} />`
- `158: <IconButton icon="call" bg={colors.primarySurface} color={colors.primary} onPress={() => {`
- `186: <Button label="اتصال بغرفة العمليات " variant="primary" size="lg" style={{ flex: 1.2 }} onPress={() => showLocalizedAlert('اتصال الطوارئ', 'جاري الاتصال بالهلال الأحمر والعمليات الصحية...')} />`
- `187: <Button label="إلغاء الطلب" variant="outline" size="lg" style={{ flex: 0.8 }} onPress={handleCancelSOS} />`
### backend_consumers_or_contracts
- `42: const res = await apiFetch('/emergency/my/active');`
- `79: await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });`
### auth_ownership
- `30: const { status } = await Location.requestForegroundPermissionsAsync();`
- `34: } catch { /* permission denied or unavailable — map simply stays hidden */ }`
- `49: // S1: patient-safe only — unit label (plate). Provider/hospital ownership is internal, never shown.`
### state_transitions
- `3: import React, { useState, useEffect } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, Linking } from 'react-native';`
- `20: const [eta, setEta] = useState<number | null>(null);`
- `21: const [dispatchStatus, setDispatchStatus] = useState('جاري تحديد مركبة الطوارئ...');`
- `22: const [paramedic, setParamedic] = useState<any>(null);`
- `23: const [vehicleLabel, setVehicleLabel] = useState<string>('');`
- `24: const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);`
- `30: const { status } = await Location.requestForegroundPermissionsAsync();`
- `31: if (status !== 'granted') return;`
- `39: const fetchStatus = async () => {`
- `41: // M1-31: real backend contract — patient's own active SOS (was non-existent /sos/status)`
- `46: setDispatchStatus(data.status_text || 'تم تحديد المسار والتحرك فورا');`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `105: <Card style={st.mapCard}>`
- `133: </Card>`
- `135: {/* ETA & Status Card */}`
- `136: <Card style={[st.statusCard, { borderRightColor: '#F0695C', borderRightWidth: 5 } ]}>`
- `147: </Card>`
- `149: {/* Driver Detail Card */}`
- `150: <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>`
- `167: </Card>`
- `169: {/* Info advice card */}`
- `170: <Card style={{ backgroundColor: colors.warningSurface, borderColor: colors.warning + '30' }}>`
- `180: </Card>`
### error_empty_loading_retry_cancel
- `34: } catch { /* permission denied or unavailable — map simply stays hidden */ }`
- `53: } catch (e) {`
- `54: console.log('Error fetching SOS status', e);`
- `64: const handleCancelSOS = () => {`
- `69: { text: 'تراجع', style: 'cancel' },`
- `79: await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });`
- `83: } catch (e: any) {`
- `100: <IconButton icon="close" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleCancelSOS} />`
- `187: <Button label="إلغاء الطلب" variant="outline" size="lg" style={{ flex: 0.8 }} onPress={handleCancelSOS} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
