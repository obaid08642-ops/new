# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/analytics.tsx`
- **Member SHA-256:** `842e40d40561a22f39cf7c49de90483c727c9ee2b1013b33a159ca769edf4d1f`
- **Line count:** 93
- **Read range:** `1-93`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default function AnalyticsPage() {`
- `51: {stat('إلغاء الطلبات', overview?.order_cancellation_rate != null ? `${overview.order_cancellation_rate}%` : '—', 'text-red-600')}`
- `52: {stat('إلغاء المواعيد', overview?.appointment_cancellation_rate != null ? `${overview.appointment_cancellation_rate}%` : '—', 'text-red-600')}`
- `63: <button key={s.key} onClick={() => setSection(s.key)}`
### backend_consumers_or_contracts
- `19: apiFetch('/admin/analytics/overview').then(setOverview).catch(() => null);`
- `24: apiFetch(`/admin/analytics/${section}?limit=15`)`
### auth_ownership
- `19: apiFetch('/admin/analytics/overview').then(setOverview).catch(() => null);`
- `24: apiFetch(`/admin/analytics/${section}?limit=15`)`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `7: { key: 'top-doctors', title: 'أكثر الأطباء مواعيداً', cols: ['الطبيب', 'المواعيد', 'المكتملة'], map: (x: any) => [x.doctor, x.appointments, x.completed] },`
- `13: const [overview, setOverview] = useState<any>(null);`
- `14: const [section, setSection] = useState('top-searched');`
- `15: const [rows, setRows] = useState<any[]>([]);`
- `16: const [loading, setLoading] = useState(true);`
- `23: setLoading(true);`
- `27: .finally(() => setLoading(false));`
- `51: {stat('إلغاء الطلبات', overview?.order_cancellation_rate != null ? `${overview.order_cancellation_rate}%` : '—', 'text-red-600')}`
- `52: {stat('إلغاء المواعيد', overview?.appointment_cancellation_rate != null ? `${overview.appointment_cancellation_rate}%` : '—', 'text-red-600')}`
- `72: {loading ? (`
### payment_insurance_relevance
- `44: {stat('المستخدمون', overview?.totals?.users)}`
- `45: {stat('الطلبات', overview?.totals?.orders)}`
- `46: {stat('المواعيد', overview?.totals?.appointments)}`
- `47: {stat('السلال', overview?.totals?.carts)}`
### error_empty_loading_retry_cancel
- `16: const [loading, setLoading] = useState(true);`
- `19: apiFetch('/admin/analytics/overview').then(setOverview).catch(() => null);`
- `23: setLoading(true);`
- `26: .catch(() => setRows([]))`
- `27: .finally(() => setLoading(false));`
- `51: {stat('إلغاء الطلبات', overview?.order_cancellation_rate != null ? `${overview.order_cancellation_rate}%` : '—', 'text-red-600')}`
- `52: {stat('إلغاء المواعيد', overview?.appointment_cancellation_rate != null ? `${overview.appointment_cancellation_rate}%` : '—', 'text-red-600')}`
- `72: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
