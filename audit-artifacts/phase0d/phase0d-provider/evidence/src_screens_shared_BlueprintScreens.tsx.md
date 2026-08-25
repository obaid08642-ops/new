# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/BlueprintScreens.tsx`
- **Member SHA-256:** `f0684e7e1e24dccb0991c144e48c203843fd5d98eea514db6f2097838a5b8875`
- **Line count:** 1408
- **Read range:** `1-1408`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: * ║ NABDAH PLUS — BLUEPRINT SCREENS (12 MODULES) ║`
- `8: * ║ 01. PromotionsDashboard & CreateCampaignScreen ║`
- `10: * ║ 03. SubscriptionsAdsScreen & AffiliatePortal ║`
- `16: * ║ 09. SosDispatchScreen & GpsRouterScreen ║`
- `19: * ║ 12. LabSampleScannerScreen & LabResultEntryScreen ║`
- `75: <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>`
- `77: <TouchableOpacity onPress={() => onNavigate('create_promo')}><I name="plus" size={20} color={theme.primary} /></TouchableOpacity>`
- `108: <NBtn label={AR ? ' إنشاء عرض جديد' : ' Create New Promotion'} onPress={() => onNavigate('create_promo')} style={{ marginTop: SP.xl }} />`
- `114: // 1.2 CREATE PROMOTION SCREEN`
- `115: export function CreateCampaignScreen({ onBack }: { onBack: () => void }) {`
- `162: <NBtn label={AR ? ' إرسال للموافقة' : ' Submit for Approval'} onPress={handleCreate} loading={loading} style={{ marginTop: SP.lg }} />`
- `193: sub={AR ? 'تمكين حجز المواعيد عبر رابط موقعك العام مباشرة' : 'Allow patients to book directly via link'}`
### backend_consumers_or_contracts
- `29: import client from '../../api/client';`
- `702: client.get('/provider/ops/wallet/ledger')`
- `837: await client.post('/home-care/notes', { patient_id: patientId, note });`
- `1330: const res = await client.get('/labs/samples');`
- `1351: await client.patch(`/labs/samples/${sam.id}/stage`, { stage: 'analyzing' });`
### auth_ownership
- `258: show(AR ? 'تم إرسال طلب الحملة الإعلانية — ستُفعّل بعد مراجعة الإدارة' : 'Ad campaign submitted — goes live after admin review', 'success');`
- `830: const patientId = selectedPatient?.patient_id || selectedPatient?.patientId || selectedPatient?.patient?.id;`
- `831: if (!patientId) {`
- `837: await client.post('/home-care/notes', { patient_id: patientId, note });`
- `883: const pid = p.patient_id || p.patientId || p.patient?.id || i;`
- `885: const sel = selectedPatient && (selectedPatient.patient_id || selectedPatient.patientId || selectedPatient.patient?.id) === (p.patient_id || p.patientId || p.patient?.id);`
- `937: const [patientId, setPatientId] = useState('patient_1');`
- `981: patient_id: patientId,`
- `1011: <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'} />`
- `1111: const { status } = await Location.requestForegroundPermissionsAsync();`
- `1197: const { status } = await Location.requestForegroundPermissionsAsync();`
- `1199: show(AR ? 'إذن الموقع مطلوب للملاحة الحية' : 'Location permission is required for live routing', 'error');`
### state_transitions
- `22: import React, { useState, useEffect, useRef, useCallback } from 'react';`
- `53: const [promos, setPromos] = useState<any[]>([]);`
- `54: const [loading, setLoading] = useState(false);`
- `57: setLoading(true);`
- `62: show(AR ? 'فشل تحميل العروض الترويجية' : 'Failed to load promotions', 'error');`
- `64: setLoading(false);`
- `82: {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}`
- `83: {!loading && promos.length === 0 && (`
- `95: label={AR ? (item.status === 'approved' ? 'مقبول' : item.status === 'pending' ? 'انتظار' : 'مؤرشف') : item.status.toUpperCase()}`
- `96: variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'primary'}`
- `121: const [title, setTitle] = useState('');`
- `122: const [origPrice, setOrigPrice] = useState('');`
### payment_insurance_relevance
- `31: NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,`
- `32: NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,`
- `89: <NCard key={item._id || item.id} style={{ marginBottom: SP.lg }}>`
- `102: <Text style={{ fontSize: FS.xs, color: theme.textSub }}> {item.discounted_price} {AR?'ريال':'SAR'} <Text style={{ textDecorationLine:'line-through' }}>{item.original_price} {AR?'ريال':'SAR'}</Text></Text>`
- `105: </NCard>`
- `122: const [origPrice, setOrigPrice] = useState('');`
- `123: const [discPrice, setDiscPrice] = useState('');`
- `129: if (!title.trim() || !origPrice || !discPrice) {`
- `138: original_price: parseFloat(origPrice),`
- `139: discounted_price: parseFloat(discPrice),`
- `158: <NPriceInput label={AR ? 'السعر الأصلي' : 'Original Price'} value={origPrice} onChange={setOrigPrice} />`
- `159: <NPriceInput label={AR ? 'السعر بعد الخصم' : 'Discounted Price'} value={discPrice} onChange={setDiscPrice} />`
### error_empty_loading_retry_cancel
- `54: const [loading, setLoading] = useState(false);`
- `57: setLoading(true);`
- `61: } catch (e) {`
- `62: show(AR ? 'فشل تحميل العروض الترويجية' : 'Failed to load promotions', 'error');`
- `64: setLoading(false);`
- `82: {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}`
- `83: {!loading && promos.length === 0 && (`
- `95: label={AR ? (item.status === 'approved' ? 'مقبول' : item.status === 'pending' ? 'انتظار' : 'مؤرشف') : item.status.toUpperCase()}`
- `96: variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'primary'}`
- `126: const [loading, setLoading] = useState(false);`
- `133: setLoading(true);`
- `145: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
