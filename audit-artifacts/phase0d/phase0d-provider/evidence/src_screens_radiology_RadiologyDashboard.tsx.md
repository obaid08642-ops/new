# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/radiology/RadiologyDashboard.tsx`
- **Member SHA-256:** `0d3e8c647db4a8c184f467fbf23ea24b23ab292e05bc4e04cc1dd1fb140de85f`
- **Line count:** 563
- **Read range:** `1-563`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { ProviderWalletScreen, MedicalJobsScreen, MedicalDrugIndexScreen } from '../shared/SharedScreens';`
- `10: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `24: CANCELLED:         { ar: 'ملغى',                   en: 'Cancelled',         color: '#9E9E9E' },`
- `41: export function RadiologyDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
- `55: <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>`
- `56: <Stack.Screen name="MainTabs">`
- `58: const go = (s: string, param?: any) => navigation.navigate(s, { param });`
- `65: {activeTab === 'settings' && <RadiologySettingsScreen onLogout={onLogout} onNav={go} />}`
- `66: <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />`
- `70: </Stack.Screen>`
- `72: <Stack.Screen name="order_detail">{({ navigation, route }: any) => <OrderDetailScreen order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `73: <Stack.Screen name="reporting">{({ navigation, route }: any) => <ReportingScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>`
### backend_consumers_or_contracts
- `5: import client from '../../api/client';`
- `10: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `91: const res = await client.get('/radiology/provider/inbox');`
- `141: const fetch = useCallback(async () => { try { setLoading(true); const res = await client.get('/radiology/provider/inbox'); setOrders(res.data || []); } catch {} finally { setLoading(false); } }, []);`
- `142: useEffect(() => { fetch(); }, [fetch]);`
- `194: const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };`
- `197: try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(AR ? 'تم بنجاح' : 'Done', 'success'); await refresh(); }`
- `205: try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمين للمريض' : 'Insurance approval sent', 'success'); setShowNphies(f`
- `212: try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket created.', 'info'); setShowAbort(false); await refresh(); }`
- `228: await client.patch(`/radiology/bookings/${currentOrder.id}/reschedule`, { new_date: newDate, reason: 'reschedule_after_abort' });`
- `270: <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CONFIRMED', note:'Cash confirmed' });`
- `272: <NBtn label={AR?' رفض الطلب':' Decline Order'} variant="danger" loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CANCELLED', note:'Rejected by cente`
### auth_ownership
- `3: import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Switch } from 'react-native';`
- `41: export function RadiologyDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
- `65: {activeTab === 'settings' && <RadiologySettingsScreen onLogout={onLogout} onNav={go} />}`
- `99: <NScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor="#009688" />}>`
- `194: const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };`
- `197: try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(AR ? 'تم بنجاح' : 'Done', 'success'); await refresh(); }`
- `205: try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمين للمريض' : 'Insurance approval sent', 'success'); setShowNphies(f`
- `212: try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket created.', 'info'); setShowAbort(false); await refresh(); }`
- `230: setShowReschedule(false); setRescheduleDays(null); await refresh();`
- `270: <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CONFIRMED', note:'Cash confirmed' });`
- `300: <Text style={{ color: '#F44336', marginBottom: SP.md, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{AR ? 'سيتم إلغاء الفحص وإنشاء طلب استرداد تلقائي للإدارة.' : 'Scan will be aborted and a refund request will be auto-generated for a`
- `441: show(AR ? 'تم إرسال طلب الإضافة للمراجعة الإدارية' : 'Add request sent for admin review', 'success');`
### state_transitions
- `2: import React, { useState, useEffect, useCallback } from 'react';`
- `6: import { NBtn, NCard, NInput, NStatCard, NAvatar, NBadge, NHeader, NScroll, NSecHeader, NBottomNav, NSheet, NPriceInput, NEmpty } from '../../components/ui';`
- `12: // ══════ PILLAR 1: STATE MACHINE LABELS ══════`
- `13: const STATE_LABELS: Record<string, { ar: string; en: string; color: string }> = {`
- `15: PENDING_INSURANCE: { ar: 'انتظار التأمين',         en: 'Pending Insurance', color: '#FF9800' },`
- `17: CONFIRMED:         { ar: 'مجدول',                  en: 'Confirmed',         color: '#009688' },`
- `24: CANCELLED:         { ar: 'ملغى',                   en: 'Cancelled',         color: '#9E9E9E' },`
- `32: { key: 'PATIENT_NO_SHOW',    ar: 'المريض لم يحضر',                     en: 'Patient No-Show' },`
- `33: { key: 'TECHNICAL_ERROR',    ar: 'خطأ تقني',                           en: 'Technical Error' },`
- `42: const [activeTab, setActiveTab] = useState('home');`
- `85: const [orders, setOrders] = useState<any[]>([]);`
- `86: const [loading, setLoading] = useState(true);`
### payment_insurance_relevance
- `6: import { NBtn, NCard, NInput, NStatCard, NAvatar, NBadge, NHeader, NScroll, NSecHeader, NBottomNav, NSheet, NPriceInput, NEmpty } from '../../components/ui';`
- `9: import { ProviderWalletScreen, MedicalJobsScreen, MedicalDrugIndexScreen } from '../shared/SharedScreens';`
- `10: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `15: PENDING_INSURANCE: { ar: 'انتظار التأمين',         en: 'Pending Insurance', color: '#FF9800' },`
- `16: WAITING_COPAY:     { ar: 'بانتظار دفع المريض',     en: 'Waiting Co-Pay',    color: '#9C27B0' },`
- `74: <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `75: <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `94: setStats({ todayCount: data.length, inScanCount: data.filter(o => o.state === 'IN_SCANNING').length, completedCount: data.filter(o => o.state === 'REPORT_READY').length, revenue: data.reduce((acc, cur) => acc + (cur.total || 0), 0) });`
- `100: <NHeader title={AR?'لوحة الأشعة':'Radiology Dashboard'} right={<TouchableOpacity onPress={() => onNav('wallet')} style={{ padding: SP.sm }}><I name="wallet" size={24} color={theme.primary} /></TouchableOpacity>} />`
- `102: <NStatCard icon="◎" label={AR ? 'فحوصات اليوم' : "Today's Scans"} value={String(stats.todayCount)} color="#009688" style={{ width: '47%' }} />`
- `103: <NStatCard icon="◔" label={AR ? 'جاري الفحص' : 'In Scanning'} value={String(stats.inScanCount)} color="#FF9800" style={{ width: '47%' }} />`
- `104: <NStatCard icon="check" label={AR ? 'مكتمل' : 'Completed'} value={String(stats.completedCount)} color="#4CAF50" style={{ width: '47%' }} />`
### error_empty_loading_retry_cancel
- `6: import { NBtn, NCard, NInput, NStatCard, NAvatar, NBadge, NHeader, NScroll, NSecHeader, NBottomNav, NSheet, NPriceInput, NEmpty } from '../../components/ui';`
- `15: PENDING_INSURANCE: { ar: 'انتظار التأمين',         en: 'Pending Insurance', color: '#FF9800' },`
- `23: SCAN_ABORTED:      { ar: 'فحص ملغى (طارئ)',        en: 'Scan Aborted',      color: '#F44336' },`
- `24: CANCELLED:         { ar: 'ملغى',                   en: 'Cancelled',         color: '#9E9E9E' },`
- `27: const ABORT_REASONS = [`
- `33: { key: 'TECHNICAL_ERROR',    ar: 'خطأ تقني',                           en: 'Technical Error' },`
- `86: const [loading, setLoading] = useState(true);`
- `90: setLoading(true);`
- `95: } catch { setOrders([]); setStats({ todayCount: 0, inScanCount: 0, completedCount: 0, revenue: 0 }); } finally { setLoading(false); }`
- `99: <NScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor="#009688" />}>`
- `108: {orders.length === 0 && !loading && <NEmpty title={AR ? 'لا توجد طلبات اليوم' : 'No orders today'} icon="document" />}`
- `140: const [loading, setLoading] = useState(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
