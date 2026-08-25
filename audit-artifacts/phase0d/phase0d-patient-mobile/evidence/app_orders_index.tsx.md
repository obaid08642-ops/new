# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/orders/index.tsx`
- **Member SHA-256:** `fe4853360b1a19fe3a20d1423dbcbd7daecaad66c0a0fff515066b67c34baf61`
- **Line count:** 286
- **Read range:** `1-286`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router, useFocusEffect } from 'expo-router';`
- `19: IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',`
- `20: RESCHEDULED: 'أعيدت جدولته', NO_SHOW: 'لم يحضر', REFUNDED: 'مسترد',`
- `22: EN_ROUTE: 'في الطريق', ARRIVED: 'وصل', ACCEPTED: 'مقبول',`
- `27: pending: 'قيد المراجعة', submitted: 'مقدّمة', active: 'نشط', resolved: 'تمت المعالجة',`
- `30: const PENDING_STATES = new Set(['PENDING', 'NEW_REQUEST', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'OUT_FOR_DELIVERY', 'SCHEDULED', 'PROCESSING', 'CHECKED_IN', 'IN_PROGRESS', 'pending', 'submitted', 'a`
- `32: const CANCELLED_STATES = new Set(['CANCELLED', 'REJECTED', 'NO_SHOW', 'rejected', 'REFUNDED']);`
- `46: ['all', 'الكل'], ['pending', 'معلقة'], ['completed', 'مكتملة'], ['cancelled', 'ملغية'],`
- `51: function statusBucket(status: string): 'pending' | 'completed' | 'cancelled' {`
- `53: if (CANCELLED_STATES.has(status)) return 'cancelled';`
- `64: export default function OrderCenterScreen() {`
- `82: safe(apiFetch('/labs/bookings/mine')),`
### backend_consumers_or_contracts
- `2: // app/orders/index.tsx — مركز الطلبات الموحد (S10): كل الطلبات والحجوزات في مكان واحد`
- `80: safe(apiFetch('/care/appointments/mine')),`
- `81: safe(apiFetch('/orders/mine')),`
- `82: safe(apiFetch('/labs/bookings/mine')),`
- `83: safe(apiFetch('/radiology/bookings/mine')),`
- `84: safe(apiFetch('/home-care/bookings/my')),`
- `85: safe(apiFetch('/insurance/claims')),`
- `86: safe(apiFetch('/pharmacy/returns')),`
- `87: safe(apiFetch('/emergency/my/active')),`
- `109: route: { pathname: '/pharmacy/order-tracking', params: { orderId: o.id } },`
- `118: route: { pathname: '/diagnostics/orders' },`
- `127: route: { pathname: '/diagnostics/orders' },`
### auth_ownership
- `6: StatusBar, ActivityIndicator, RefreshControl,`
- `42: returns: { label: 'مرتجع', icon: 'refresh', color: '#8B5CF6' },`
- `70: const [refreshing, setRefreshing] = useState(false);`
- `171: setRefreshing(false);`
- `243: refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}`
- `255: accessibilityRole="button"`
### state_transitions
- `3: import React, { useState, useCallback } from 'react';`
- `6: StatusBar, ActivityIndicator, RefreshControl,`
- `17: const STATUS_AR: Record<string, string> = {`
- `18: PENDING: 'بانتظار التأكيد', CONFIRMED: 'مؤكد', CHECKED_IN: 'تم الحضور',`
- `19: IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',`
- `20: RESCHEDULED: 'أعيدت جدولته', NO_SHOW: 'لم يحضر', REFUNDED: 'مسترد',`
- `23: REJECTED: 'مرفوض', PREPARING: 'قيد التحضير', READY: 'جاهز',`
- `24: OUT_FOR_DELIVERY: 'في الطريق إليك', DELIVERED: 'تم التوصيل',`
- `26: RESULT_READY: 'النتيجة جاهزة', approved: 'مقبولة', rejected: 'مرفوضة',`
- `27: pending: 'قيد المراجعة', submitted: 'مقدّمة', active: 'نشط', resolved: 'تمت المعالجة',`
- `30: const PENDING_STATES = new Set(['PENDING', 'NEW_REQUEST', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'OUT_FOR_DELIVERY', 'SCHEDULED', 'PROCESSING', 'CHECKED_IN', 'IN_PROGRESS', 'pending', 'submitted', 'a`
- `31: const COMPLETED_STATES = new Set(['COMPLETED', 'DELIVERED', 'RESULT_READY', 'approved', 'resolved']);`
### payment_insurance_relevance
- `20: RESCHEDULED: 'أعيدت جدولته', NO_SHOW: 'لم يحضر', REFUNDED: 'مسترد',`
- `32: const CANCELLED_STATES = new Set(['CANCELLED', 'REJECTED', 'NO_SHOW', 'rejected', 'REFUNDED']);`
- `41: insurance: { label: 'مطالبة تأمين', icon: 'shield', color: '#0EA5E9' },`
- `48: ['nursing', 'تمريض'], ['ambulance', 'إسعاف'], ['insurance', 'تأمين'], ['returns', 'مرتجعات'],`
- `85: safe(apiFetch('/insurance/claims')),`
- `141: id: c.id, kind: 'insurance',`
- `143: subtitle: c.provider || c.insurance_company || '',`
- `145: route: { pathname: '/insurance/claim-tracking' },`
- `258: style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}`
- `283: card: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 14, padding: 12, gap: 10 },`
### error_empty_loading_retry_cancel
- `18: PENDING: 'بانتظار التأكيد', CONFIRMED: 'مؤكد', CHECKED_IN: 'تم الحضور',`
- `19: IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',`
- `27: pending: 'قيد المراجعة', submitted: 'مقدّمة', active: 'نشط', resolved: 'تمت المعالجة',`
- `30: const PENDING_STATES = new Set(['PENDING', 'NEW_REQUEST', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'OUT_FOR_DELIVERY', 'SCHEDULED', 'PROCESSING', 'CHECKED_IN', 'IN_PROGRESS', 'pending', 'submitted', 'a`
- `32: const CANCELLED_STATES = new Set(['CANCELLED', 'REJECTED', 'NO_SHOW', 'rejected', 'REFUNDED']);`
- `46: ['all', 'الكل'], ['pending', 'معلقة'], ['completed', 'مكتملة'], ['cancelled', 'ملغية'],`
- `51: function statusBucket(status: string): 'pending' | 'completed' | 'cancelled' {`
- `53: if (CANCELLED_STATES.has(status)) return 'cancelled';`
- `54: return 'pending';`
- `61: } catch { return '—'; }`
- `69: const [loading, setLoading] = useState(true);`
- `71: const [failedSources, setFailedSources] = useState(0);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
