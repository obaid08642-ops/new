# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/order-detail.tsx`
- **Member SHA-256:** `06ae2f8428067629748e733615cb003088f13abf47a9da7aadb8322d77315eca`
- **Line count:** 121
- **Read range:** `1-121`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { useRouter } from 'next/router';`
- `8: export default function OrderDetailPage() {`
- `9: const router = useRouter();`
- `10: const { kind, id } = router.query as { kind?: string; id?: string };`
- `29: <button onClick={() => router.back()} className="text-teal-700 font-bold text-sm">→ عودة لمركز القيادة</button>`
### backend_consumers_or_contracts
- `18: apiFetch(`/admin/command-center/order/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`)`
### auth_ownership
- `18: apiFetch(`/admin/command-center/order/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`)`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `11: const [data, setData] = useState<any>(null);`
- `12: const [error, setError] = useState<string | null>(null);`
- `13: const [loading, setLoading] = useState(true);`
- `17: setLoading(true);`
- `20: .catch((e: any) => setError(e?.message || 'تعذر تحميل تفاصيل الطلب'))`
- `21: .finally(() => setLoading(false));`
- `31: {loading ? (`
- `33: ) : error ? (`
- `34: <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>`
- `44: {data.universal_state || data.state}`
- `48: <div><div className="text-slate-400 text-xs">الحالة الداخلية</div><div className="font-bold">{data.state}</div></div>`
### payment_insurance_relevance
- `49: <div><div className="text-slate-400 text-xs">القيمة</div><div className="font-bold">{Math.round(Number(data.total) || 0)} ر.س</div></div>`
- `50: <div><div className="text-slate-400 text-xs">طريقة الدفع</div><div className="font-bold">{data.payment_method || '—'}</div></div>`
- `92: <td className="p-2 font-bold">{it.price ?? it.cashPrice ?? '—'}</td>`
### error_empty_loading_retry_cancel
- `12: const [error, setError] = useState<string | null>(null);`
- `13: const [loading, setLoading] = useState(true);`
- `17: setLoading(true);`
- `20: .catch((e: any) => setError(e?.message || 'تعذر تحميل تفاصيل الطلب'))`
- `21: .finally(() => setLoading(false));`
- `31: {loading ? (`
- `33: ) : error ? (`
- `34: <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
