# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/commissions.tsx`
- **Member SHA-256:** `ce3900c3190d6d8334255bf8721daf32cb08875b70c4a3c557b8c444cfb335b2`
- **Line count:** 144
- **Read range:** `1-144`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `19: export default function CommissionsPage() {`
- `51: <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">تحديث </button>`
### backend_consumers_or_contracts
- `30: apiFetch('/admin/finance/ledger/summary').catch(() => null),`
- `31: apiFetch('/admin/finance/commissions').catch(() => ({ data: [] })),`
### auth_ownership
- `7: * GET /admin/finance/ledger/summary (M3 finance core) · GET /admin/finance/commissions (legacy ledger)`
- `30: apiFetch('/admin/finance/ledger/summary').catch(() => null),`
- `31: apiFetch('/admin/finance/commissions').catch(() => ({ data: [] })),`
- `128: <td className="p-3 font-mono">{String(c.providerId || c.provider_id || '').slice(0, 10)}</td>`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `20: const [summary, setSummary] = useState<any>(null);`
- `21: const [legacy, setLegacy] = useState<any[]>([]);`
- `22: const [loading, setLoading] = useState(true);`
- `23: const [error, setError] = useState<string | null>(null);`
- `26: setLoading(true);`
- `27: setError(null);`
- `36: setError(e?.message || 'تعذر تحميل بيانات العمولات');`
- `38: setLoading(false);`
- `54: {loading ? (`
- `56: ) : error ? (`
- `57: <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>`
### payment_insurance_relevance
- `44: const totalGross = (summary?.by_service || []).reduce((s: number, r: any) => s + (r.gross || 0), 0);`
- `60: {/* KPI cards */}`
- `64: <div className="text-3xl font-black mt-2">{summary?.total_commission ?? 0} ر.س</div>`
- `68: <div className="text-3xl font-black mt-2 text-slate-900">{Math.round(totalGross * 100) / 100} ر.س</div>`
- `73: {totalGross > 0 ? `${Math.round(((summary?.total_commission || 0) / totalGross) * 1000) / 10}%` : '—'}`
### error_empty_loading_retry_cancel
- `22: const [loading, setLoading] = useState(true);`
- `23: const [error, setError] = useState<string | null>(null);`
- `26: setLoading(true);`
- `27: setError(null);`
- `30: apiFetch('/admin/finance/ledger/summary').catch(() => null),`
- `31: apiFetch('/admin/finance/commissions').catch(() => ({ data: [] })),`
- `35: } catch (e: any) {`
- `36: setError(e?.message || 'تعذر تحميل بيانات العمولات');`
- `38: setLoading(false);`
- `54: {loading ? (`
- `56: ) : error ? (`
- `57: <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
