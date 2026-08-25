# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/RealScreensExtended.tsx`
- **Member SHA-256:** `05a03ac4b21bbdc1a080d97e392581ceca97e68968fd3df76f415e16605fb408`
- **Line count:** 507
- **Read range:** `1-507`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: // 1. PHARMACY QR MENU SCREEN`
- `10: export function PharmacyQRMenuScreen({ onBack }: { onBack: () => void }) {`
- `25: <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%' }} />`
- `31: // 2. CHRONIC DISEASE PROGRAM SCREEN`
- `32: export function ChronicDiseaseProgramScreen({ onBack }: { onBack: () => void }) {`
- `90: // 3. DELIVERY TRACKING SCREEN`
- `91: export function DeliveryTrackingScreen({ order, onBack }: { order?: any; onBack: () => void }) {`
- `133: ? (AR ? `المندوب: ${courierName} (في الطريق للمريض)` : `Driver: ${courierName} (En route to patient)`)`
- `146: <NBtn label={AR?'الاتصال بمندوب التوصيل':'Call Driver'} onPress={() => Linking.openURL(`tel:${courierPhone}`)} style={{ marginTop: SP.md }} />`
- `156: // 4. MEDICATION REFILLS SCREEN`
- `157: export function MedicationRefillsScreen({ onBack }: { onBack: () => void }) {`
- `195: // 5. DRUG PRICE COMPARISON SCREEN`
### backend_consumers_or_contracts
- `7: import client from '../../api/client';`
- `38: client.get('/pharmacy/orders/refills')`
- `99: client.get('/provider/pharmacy/allocations', { params: { status: 'out_for_delivery' } })`
- `162: client.get('/pharmacy/orders/refills')`
- `268: const res = await client.get('/pharmacy/inventory/expiry');`
### auth_ownership
- `231: show(AR ? 'تم إرسال الصنف لمراجعة الإدارة واعتماده' : 'Product submitted for admin review and approval', 'success');`
- `348: show(AR ? 'تم إرسال البلاغ للإدارة — سيصلك الرد عبر الدعم' : 'Report sent to admin — you will be answered via support', 'success');`
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty, NSecHeader } from '../../components/ui';`
- `25: <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%' }} />`
- `34: const [patients, setPatients] = useState<any[]>([]);`
- `35: const [loading, setLoading] = useState(true);`
- `45: status: o.state || 'Active',`
- `49: .finally(() => setLoading(false));`
- `61: {AR ? `${loading ? '…' : patients.length} مريضاً في برنامج إعادة الصرف` : `${loading ? '…' : patients.length} patients in refill program`}`
- `65: {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}`
- `66: {!loading && patients.length === 0 && (`
- `78: <NBadge label={AR ? 'تجديد مجدول' : 'Scheduled'} variant="success" />`
- `93: const [delivery, setDelivery] = useState<any>(order || null);`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty, NSecHeader } from '../../components/ui';`
- `16: <NCard style={{ width: '100%', alignItems: 'center', padding: SP.xl, marginBottom: SP.md }}>`
- `24: </NCard>`
- `56: <NCard style={{ marginBottom: SP.md, backgroundColor: theme.primary, padding: SP.lg }}>`
- `63: </NCard>`
- `67: <NCard style={{ alignItems: 'center', paddingVertical: SP.xxl }}>`
- `69: </NCard>`
- `72: <NCard key={p.id} style={{ marginBottom: SP.sm }}>`
- `83: </NCard>`
- `119: <NCard style={{ padding: SP.lg, alignItems: 'center' }}>`
- `123: </NCard>`
- `126: <NCard style={{ marginBottom: SP.md, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }}>`
### error_empty_loading_retry_cancel
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty, NSecHeader } from '../../components/ui';`
- `25: <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%' }} />`
- `35: const [loading, setLoading] = useState(true);`
- `48: .catch(() => setPatients([]))`
- `49: .finally(() => setLoading(false));`
- `61: {AR ? `${loading ? '…' : patients.length} مريضاً في برنامج إعادة الصرف` : `${loading ? '…' : patients.length} patients in refill program`}`
- `65: {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}`
- `66: {!loading && patients.length === 0 && (`
- `94: const [loading, setLoading] = useState(!order);`
- `104: .catch(() => setDelivery(null))`
- `105: .finally(() => setLoading(false));`
- `116: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
