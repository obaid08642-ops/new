# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/lab/LabDashboard.tsx`
- **Member SHA-256:** `5598067bbd62c85020ff35de7804fefb6d444f48cc6fa01bb60da0809ca9f55f`
- **Line count:** 1611
- **Read range:** `1-1611`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: * NABDAH PLUS – PHASE 4 · LAB & RADIOLOGY DASHBOARD (18 screens)`
- `13: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `24: PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,`
- `26: LabSampleScannerScreen`
- `27: } from '../shared/BlueprintScreens';`
- `28: import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';`
- `29: import { WorkingHoursEditorScreen, SecurityManagementScreen } from '../shared/RealScreens';`
- `30: import { LabBundlesScreen, LabHomeServiceScreen } from '../shared/RealScreensExtended';`
- `66: if (subTab === 'results') return orders.filter(o => ['RESULT_UPLOADED'].includes(o.status));`
- `79: <TouchableOpacity onPress={() => setSubTab('incoming')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'incoming' ? theme.primary : 'transparent' }}>`
- `82: <TouchableOpacity onPress={() => setSubTab('scheduled')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'scheduled' ? theme.primary : 'transparent' }}>`
- `85: <TouchableOpacity onPress={() => setSubTab('processing')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'processing' ? theme.primary : 'transparent' }}>`
### backend_consumers_or_contracts
- `12: import client from '../../api/client';`
- `13: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `56: client.get('/labs/provider/inbox')`
- `224: const inboxRes = await client.get('/labs/provider/inbox');`
- `241: const resSamples = await client.get('/labs/samples');`
- `373: await client.patch(`/labs/bookings/${order.id}/state`, { state: 'SAMPLE_REJECTED' });`
- `383: await client.patch(`/labs/bookings/${order.id}/state`, { state: 'WAITING_COPAY', note: `nphies_code: ${nphiesCode}, copay: ${copay}` });`
- `397: await client.patch(`/labs/bookings/${order.id}/state`, { state: 'CONFIRMED' });`
- `410: await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: techName });`
- `425: await client.patch(`/labs/bookings/${order.id}/reschedule`, { new_date: rescheduleDate, reason: 'Provider Reschedule' });`
- `440: await client.patch(`/labs/bookings/${order.id}/state`, { state: 'PROCESSING', note: `Barcode: ${barcode}. ${notes}` });`
- `614: const res = await client.get('/labs/samples');`
### auth_ownership
- `7: Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput`
- `9: import { CameraView, useCameraPermissions } from 'expo-camera';`
- `136: export function LabDashboardNavigator({ onLogout }: { onLogout:()=>void }) {`
- `160: {tab==='settings' && <LabSettings onLogout={onLogout} onNavigate={go} />}`
- `217: const [refreshing, setR] = useState(false);`
- `251: // No fabricated numbers — show zeros and let the provider pull-to-refresh.`
- `262: const onRefresh = async () => {`
- `284: <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9C27B0" />}`
- `358: const [camPerm, requestCamPerm] = useCameraPermissions();`
- `364: if (!r?.granted) { show(AR ? 'صلاحية الكاميرا مرفوضة' : 'Camera permission denied', 'error'); return; }`
- `659: refreshing={loading}`
- `660: onRefresh={fetchSamples}`
### state_transitions
- `4: import React, { useState, useRef, useEffect, useCallback } from 'react';`
- `18: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `36: { key: 'PENDING', ar: 'قيد الانتظار', en: 'Pending', color: '#FF9800' },`
- `40: { key: 'COMPLETED', ar: 'مكتمل', en: 'Completed', color: '#4CAF50' },`
- `41: { key: 'SAMPLE_REJECTED', ar: 'عينة مرفوضة', en: 'Sample Rejected', color: '#F44336' },`
- `51: const [subTab, setSubTab] = useState<'incoming' | 'scheduled' | 'processing' | 'results'>('incoming');`
- `52: const [orders, setOrders] = useState<any[]>([]);`
- `53: const [loading, setLoading] = useState(true);`
- `59: .finally(() => setLoading(false));`
- `63: if (subTab === 'incoming') return orders.filter(o => ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.status));`
- `64: if (subTab === 'scheduled') return orders.filter(o => ['CONFIRMED', 'ASSIGNED', 'IN_TRANSIT'].includes(o.status));`
- `65: if (subTab === 'processing') return orders.filter(o => ['SAMPLE_COLLECTED', 'PROCESSING', 'SAMPLE_REJECTED'].includes(o.status));`
### payment_insurance_relevance
- `13: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `16: NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,`
- `19: NDivider, NPriceInput`
- `28: import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';`
- `63: if (subTab === 'incoming') return orders.filter(o => ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.status));`
- `99: <NCard key={order.id} style={{ marginBottom: SP.md, borderColor: order.status === 'SAMPLE_REJECTED' ? theme.danger : theme.border, borderWidth: 1 }} onPress={() => onNav('order_detail', order)}>`
- `104: <Text style={{ fontSize: FS.sm, color: theme.textSub, fontWeight:'bold' }}>{order.is_insurance?' NPHIES':' Cash'}</Text>`
- `113: <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: FS.lg }}>{order.total} SAR</Text>`
- `122: </NCard>`
- `181: <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `184: <Stack.Screen name="insurance">{({ navigation }: any) => <LabInsurance onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `195: <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
### error_empty_loading_retry_cancel
- `18: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `36: { key: 'PENDING', ar: 'قيد الانتظار', en: 'Pending', color: '#FF9800' },`
- `53: const [loading, setLoading] = useState(true);`
- `58: .catch(() => setOrders([]))`
- `59: .finally(() => setLoading(false));`
- `63: if (subTab === 'incoming') return orders.filter(o => ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.status));`
- `95: {filtered.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات هنا' : 'No Orders Here'} icon="document" />}`
- `234: status: x.state === 'SAMPLE_COLLECTED' ? 'analyzing' : x.state === 'REPORTED' ? 'ready' : 'pending',`
- `250: } catch (e: any) {`
- `354: const [loading, setLoading] = useState(false);`
- `364: if (!r?.granted) { show(AR ? 'صلاحية الكاميرا مرفوضة' : 'Camera permission denied', 'error'); return; }`
- `367: } catch { show(AR ? 'الكاميرا غير متاحة على هذا الجهاز' : 'Camera unavailable on this device', 'error'); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
