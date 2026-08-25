# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/insurance-queue.tsx`
- **Member SHA-256:** `81f96f5a0486ea4887476f1ad57b195d01670f63cbcb93f314f118597c0083ed`
- **Line count:** 221
- **Read range:** `1-221`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `9: * - GET /admin/finance/refunds/queue · POST /admin/finance/refunds/:id/decide`
- `19: export default function InsuranceQueuePage() {`
- `20: const [tab, setTab] = useState<'requests' | 'refunds'>('requests');`
- `23: const [refunds, setRefunds] = useState<any[]>([]);`
- `38: apiFetch('/admin/finance/refunds/queue').catch(() => []),`
- `42: setRefunds(Array.isArray(f) ? f : f?.data || []);`
- `52: const decideRefund = async (id: string, approve: boolean) => {`
- `54: await apiFetch(`/admin/finance/refunds/${id}/decide`, {`
- `66: onClick={() => setStateFilter(stateFilter === key ? '' : key)}`
- `92: { k: 'refunds', label: `طابور المستردات (${refunds.length})` },`
- `96: onClick={() => setTab(t.k)}`
### backend_consumers_or_contracts
- `8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `36: apiFetch('/admin/insurance/stats').catch(() => null),`
- `37: apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `38: apiFetch('/admin/finance/refunds/queue').catch(() => []),`
- `54: await apiFetch(`/admin/finance/refunds/${id}/decide`, {`
### auth_ownership
- `8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `9: * - GET /admin/finance/refunds/queue · POST /admin/finance/refunds/:id/decide`
- `36: apiFetch('/admin/insurance/stats').catch(() => null),`
- `37: apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `38: apiFetch('/admin/finance/refunds/queue').catch(() => []),`
- `54: await apiFetch(`/admin/finance/refunds/${id}/decide`, {`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `9: * - GET /admin/finance/refunds/queue · POST /admin/finance/refunds/:id/decide`
- `11: const STATE_AR: Record<string, { ar: string; cls: string }> = {`
- `12: PENDING_PROVIDER_REVIEW: { ar: 'بانتظار المزود', cls: 'bg-amber-100 text-amber-700' },`
- `13: APPROVED_FULL: { ar: 'قبول كلي', cls: 'bg-green-100 text-green-700' },`
- `14: COPAY_PENDING: { ar: 'بانتظار copay', cls: 'bg-blue-100 text-blue-700' },`
- `16: REJECTED: { ar: 'مرفوض', cls: 'bg-red-100 text-red-700' },`
- `20: const [tab, setTab] = useState<'requests' | 'refunds'>('requests');`
- `21: const [stats, setStats] = useState<any>(null);`
### payment_insurance_relevance
- `7: * M5: insurance supervision (BR-2) + refunds queue (BR: الاسترداد).`
- `8: * - GET /admin/insurance/stats · GET /admin/insurance/requests?state=`
- `9: * - GET /admin/finance/refunds/queue · POST /admin/finance/refunds/:id/decide`
- `14: COPAY_PENDING: { ar: 'بانتظار copay', cls: 'bg-blue-100 text-blue-700' },`
- `15: COPAY_PAID: { ar: 'تم الدفع', cls: 'bg-green-100 text-green-700' },`
- `19: export default function InsuranceQueuePage() {`
- `20: const [tab, setTab] = useState<'requests' | 'refunds'>('requests');`
- `23: const [refunds, setRefunds] = useState<any[]>([]);`
- `36: apiFetch('/admin/insurance/stats').catch(() => null),`
- `37: apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `38: apiFetch('/admin/finance/refunds/queue').catch(() => []),`
- `42: setRefunds(Array.isArray(f) ? f : f?.data || []);`
### error_empty_loading_retry_cancel
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `12: PENDING_PROVIDER_REVIEW: { ar: 'بانتظار المزود', cls: 'bg-amber-100 text-amber-700' },`
- `14: COPAY_PENDING: { ar: 'بانتظار copay', cls: 'bg-blue-100 text-blue-700' },`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `32: setLoading(true);`
- `33: setError(null);`
- `36: apiFetch('/admin/insurance/stats').catch(() => null),`
- `37: apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `38: apiFetch('/admin/finance/refunds/queue').catch(() => []),`
- `43: } catch (e: any) {`
- `44: setError(e?.message || 'تعذر تحميل البيانات');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
