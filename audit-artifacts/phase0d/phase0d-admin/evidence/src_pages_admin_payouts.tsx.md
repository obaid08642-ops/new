# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/payouts.tsx`
- **Member SHA-256:** `23de0779928df008521f29ae1e70c42b2be4670ebd59d515ea551cd8fc865b91`
- **Line count:** 164
- **Read range:** `1-164`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: export default function PayoutApprovalPage() {`
- `76: <button onClick={fetchPayouts} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm">`
- `86: <button onClick={fetchPayouts} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">إعادة المحاولة</button>`
- `125: onClick={() => handleExecutePayout(item.id)}`
- `131: onClick={() => setRejectingId(rejectingId === item.id ? null : item.id)}`
- `149: <button onClick={() => handleReject(item.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">تأكيد الرفض</button>`
- `150: <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">تراجع</button>`
### backend_consumers_or_contracts
- `34: const json = await apiFetch('/admin/finance/withdrawals/pending');`
- `48: await apiFetch(`/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });`
- `58: await apiFetch(`/admin/finance/withdrawals/${id}/reject`, {`
### auth_ownership
- `13: providerId?: string;`
- `34: const json = await apiFetch('/admin/finance/withdrawals/pending');`
- `48: await apiFetch(`/admin/finance/withdrawals/${id}/execute`, { method: 'POST' });`
- `58: await apiFetch(`/admin/finance/withdrawals/${id}/reject`, {`
- `113: <td className="p-4 font-medium">{item.providerName || item.providerId || 'مزود خدمة'}</td>`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `19: status: string;`
- `24: const [payouts, setPayouts] = useState<PayoutRequest[]>([]);`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `27: const [rejectingId, setRejectingId] = useState<string | null>(null);`
- `28: const [rejectReason, setRejectReason] = useState('');`
- `32: setLoading(true);`
- `33: setError(null);`
- `34: const json = await apiFetch('/admin/finance/withdrawals/pending');`
- `37: setError(e?.message || 'تعذر تحميل طلبات السحب');`
### payment_insurance_relevance
- `7: * M5: payouts execution — reads the unified queue (legacy WithdrawalRequest`
- `10: interface PayoutRequest {`
- `23: export default function PayoutApprovalPage() {`
- `24: const [payouts, setPayouts] = useState<PayoutRequest[]>([]);`
- `30: const fetchPayouts = async () => {`
- `35: setPayouts(json.data || []);`
- `43: useEffect(() => { fetchPayouts(); }, []);`
- `45: const handleExecutePayout = async (id: string) => {`
- `50: fetchPayouts();`
- `64: fetchPayouts();`
- `76: <button onClick={fetchPayouts} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm">`
- `86: <button onClick={fetchPayouts} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">إعادة المحاولة</button>`
### error_empty_loading_retry_cancel
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `32: setLoading(true);`
- `33: setError(null);`
- `34: const json = await apiFetch('/admin/finance/withdrawals/pending');`
- `36: } catch (e: any) {`
- `37: setError(e?.message || 'تعذر تحميل طلبات السحب');`
- `39: setLoading(false);`
- `51: } catch (e: any) {`
- `65: } catch (e: any) {`
- `81: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
