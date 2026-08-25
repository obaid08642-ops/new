# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/pharmacy/PharmacyDashboard.tsx`
- **Member SHA-256:** `f0cbf70dac1ee4183f84080b039f783c553ad5a0fdee2811dac3e459750d6130`
- **Line count:** 1755
- **Read range:** `1-1755`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * ║ NABDAH PLUS – PHASE 3 · PHARMACY DASHBOARD (ALL SCREENS) ║`
- `6: * ║ 02. BroadcastOrderScreen — accept/partial/reject + alternatives ║`
- `7: * ║ 03. OrderDetailScreen — full order details + item-level actions ║`
- `9: * ║ 05. MedicationRefillsScreen — chronic meds auto-refill management ║`
- `10: * ║ 06. DrugPriceComparisonScreen— compare prices across pharmacies ║`
- `12: * ║ 08. AddProductScreen — add drug → admin approval flow ║`
- `13: * ║ 09. ExpiryTrackingScreen — track expiry dates + batch recall ║`
- `14: * ║ 10. ShortageReportScreen — report shortage → admin ║`
- `15: * ║ 11. B2BSupplyRequestScreen — Voice/OCR/Manual supplier orders ║`
- `16: * ║ 12. OrderHistoryScreen — all past orders + status + filter ║`
- `17: * ║ 13. DeliveryTrackingScreen — live delivery map + driver status ║`
- `18: * ║ 14. PharmacyQRMenuScreen — QR code for customer product catalog ║`
### backend_consumers_or_contracts
- `42: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `44: import client from '../../api/client';`
- `216: // Simulated WebSocket connection for Live Radar (Polling fallback)`
- `221: client.get('/provider/pharmacy/broadcasts') // real open broadcasts for this pharmacy`
- `256: const res = await client.post(`/provider/pharmacy/orders/${orderId}/accept`);`
- `275: await client.post(`/provider/pharmacy/broadcasts/${rejectOrderId}/reject`, { reason: reasonId });`
- `384: const res = await client.get(`/pharmacy/prescriptions/${encodeURIComponent(rxNumber.trim())}`);`
- `405: await client.post(`/pharmacy/orders/${order.id}/ready`);`
- `510: client.get('/pharmacy/returns/provider/list')`
- `527: const res: any = await client.get('/pharmacy/procurement/my-requests');`
- `536: const res: any = await client.post('/pharmacy/procurement/analyze-file', payload);`
- `575: await client.post('/pharmacy/procurement/submit-request', {`
### auth_ownership
- `12: * ║ 08. AddProductScreen — add drug → admin approval flow ║`
- `14: * ║ 10. ShortageReportScreen — report shortage → admin ║`
- `30: Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, Modal, TextInput, ActivityIndicator, Linking`
- `73: export function PharmacyDashboardNavigator({ onLogout }: { onLogout:()=>void }) {`
- `560: const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `561: if (!perm.granted) { show(AR ? 'يلزم إذن الوصول للصور' : 'Photo permission required', 'error'); return; }`
- `583: show(AR ? 'تم إرسال طلب عرض السعر للإدارة — سيصلك الرد هنا' : 'Quote request sent to admin', 'success');`
- `709: {r.status === 'PENDING_ADMIN_REVIEW' ? (AR ? 'بانتظار عرض السعر' : 'Awaiting quote')`
- `743: {AR ? 'قرار القبول/الرفض والاسترداد يتم من إدارة المنصة' : 'Approval and refund decisions are handled by platform admin'}`
- `969: {AR ? 'قرار القبول/الرفض والاسترداد يتم من إدارة المنصة' : 'Approval and refund decisions are handled by platform admin'}`
- `1437: <NBtn label={AR ? 'تحديث' : 'Refresh'} size="sm" variant="outline" onPress={load} />`
- `1684: const byPatient = item.sender_role === 'patient';`
### state_transitions
- `16: * ║ 12. OrderHistoryScreen — all past orders + status + filter ║`
- `17: * ║ 13. DeliveryTrackingScreen — live delivery map + driver status ║`
- `25: import React, { useState, useRef, useEffect, useCallback } from 'react';`
- `38: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `74: const [activeTab, setTab] = useState('home');`
- `78: const [alarmVisible, setAlarmVisible] = useState(false);`
- `80: const [unlocked, setUnlocked] = useState(false);`
- `81: const [bioError, setBioError] = useState('');`
- `89: if (ok.success) setUnlocked(true);`
- `90: else setBioError('فشلت المصادقة الحيوية. الرجاء المحاولة مرة أخرى.');`
- `116: <Text style={{color:theme.danger, fontSize:FS.md, textAlign:'center', marginBottom:SP.lg}}>{bioError}</Text>`
- `117: <NBtn label={AR ? 'إعادة المحاولة' : 'Try Again'} onPress={() => { setBioError(''); Biometric.authenticate('قم بالمصادقة').then(r => r.success ? setUnlocked(true) : setBioError('فشلت المصادقة الحيوية')); }} />`
### payment_insurance_relevance
- `10: * ║ 06. DrugPriceComparisonScreen— compare prices across pharmacies ║`
- `20: * ║ 16. PharmacyWalletScreen — earnings + withdrawal ║`
- `36: NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,`
- `39: NDivider, NPriceInput, NRadio, NProfileImageUploader`
- `42: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `45: import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';`
- `63: MedicationRefillsScreen, DrugPriceComparisonScreen, AddProductScreen,`
- `141: <Stack.Screen name="wallet">{({ navigation }: any) => <PharmacyWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `160: <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `164: <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `167: <Stack.Screen name="pricing_fees">{({ navigation }: any) => <DrugPriceComparisonScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `228: total: b.total ?? b.order?.total,`
### error_empty_loading_retry_cancel
- `38: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `81: const [bioError, setBioError] = useState('');`
- `90: else setBioError('فشلت المصادقة الحيوية. الرجاء المحاولة مرة أخرى.');`
- `116: <Text style={{color:theme.danger, fontSize:FS.md, textAlign:'center', marginBottom:SP.lg}}>{bioError}</Text>`
- `117: <NBtn label={AR ? 'إعادة المحاولة' : 'Try Again'} onPress={() => { setBioError(''); Biometric.authenticate('قم بالمصادقة').then(r => r.success ? setUnlocked(true) : setBioError('فشلت المصادقة الحيوية')); }} />`
- `207: } catch (e) {`
- `234: .catch(() => {});`
- `267: } catch (e: any) {`
- `268: show(AR ? 'الطلب أُخذ من صيدلية أخرى' : 'Order taken by another pharmacy', 'error');`
- `278: } catch(e) {}`
- `290: {isOnline? (AR?' متصل - جاهز لاستقبال الطلبات':' Online - Ready'): (AR?' غير متصل':' Offline')}`
- `297: <NEmpty icon="moon" title={AR ? 'أنت غير متصل' : 'You are offline'} sub={AR ? 'قم بتفعيل الاتصال لاستقبال الطلبات' : 'Go online to receive orders'} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
