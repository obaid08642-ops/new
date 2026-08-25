# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/health-dashboard.tsx`
- **Member SHA-256:** `5e054e55894f3f0ebbeb7a96ddd704d1cc55efab8fbddfcbf6c4505c06721cf1`
- **Line count:** 124
- **Read range:** `1-124`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export default function HealthDashboardPage() {`
### backend_consumers_or_contracts
- `9: apiFetch('/admin/health-dashboard')`
### auth_ownership
- `9: apiFetch('/admin/health-dashboard')`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `5: const [d, setD] = useState<any>(null);`
- `6: const [loading, setLoading] = useState(true);`
- `12: .finally(() => setLoading(false));`
- `20: if (loading) return <div className="p-8 text-center text-gray-500" dir="rtl">جاري تحميل لوحة الصحة...</div>;`
- `24: const up = s?.status === 'up';`
- `70: {metric('بلاغات نقص معلقة', d.metrics.pending_shortage_reports, 'text-red-600')}`
- `71: {metric('اقتراحات صور معلقة', d.metrics.pending_image_suggestions, 'text-red-600')}`
- `98: <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{c.status}</span></td>`
- `107: {(d.recent_errors || []).length === 0 ? (`
- `112: {d.recent_errors.map((e: any, i: number) => (`
### payment_insurance_relevance
- `66: {metric('المستخدمون', d.metrics.users_total)}`
- `67: {metric('الأدوية', d.metrics.medicines_total)}`
### error_empty_loading_retry_cancel
- `6: const [loading, setLoading] = useState(true);`
- `11: .catch(() => setD(null))`
- `12: .finally(() => setLoading(false));`
- `20: if (loading) return <div className="p-8 text-center text-gray-500" dir="rtl">جاري تحميل لوحة الصحة...</div>;`
- `70: {metric('بلاغات نقص معلقة', d.metrics.pending_shortage_reports, 'text-red-600')}`
- `71: {metric('اقتراحات صور معلقة', d.metrics.pending_image_suggestions, 'text-red-600')}`
- `107: {(d.recent_errors || []).length === 0 ? (`
- `112: {d.recent_errors.map((e: any, i: number) => (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
