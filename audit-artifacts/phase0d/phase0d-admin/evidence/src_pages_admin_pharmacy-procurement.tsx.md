# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/pharmacy-procurement.tsx`
- **Member SHA-256:** `90c61ca26ce680b7fe4fad7f53f01a4afe670f6b651654218b644d9128803444`
- **Line count:** 181
- **Read range:** `1-181`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * Pharmacies submit shortage lists (file/photo/manual basket) from the provider`
- `18: CANCELLED: { ar: 'ملغي', cls: 'bg-red-100 text-red-700' },`
- `22: export default function PharmacyProcurementPage() {`
- `87: <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm">تحديث</button>`
- `115: {r.uploaded_file_url && (`
- `116: <a href={r.uploaded_file_url} target="_blank" rel="noreferrer" className="text-teal-700 text-sm font-bold underline">الملف المرفق</a>`
- `119: onClick={() => { setSelected(isOpen ? null : r); setItemPrices({}); }}`
- `166: <button onClick={issueQuote} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50">`
### backend_consumers_or_contracts
- `40: const res = await apiFetch('/admin/extended-operations/procurement/pending');`
- `63: await apiFetch(`/admin/extended-operations/issue-quote/${selected._id || selected.id}`, {`
### auth_ownership
- `8: * app; admin reviews each request here, analyzes items, and issues a price`
- `11: * Backend: GET  /admin/extended-operations/procurement/pending`
- `12: *          PATCH /admin/extended-operations/issue-quote/:id`
- `15: PENDING_ADMIN_REVIEW: { ar: 'بانتظار مراجعة الإدارة', cls: 'bg-amber-100 text-amber-700' },`
- `40: const res = await apiFetch('/admin/extended-operations/procurement/pending');`
- `63: await apiFetch(`/admin/extended-operations/issue-quote/${selected._id || selected.id}`, {`
- `161: {r.status === 'PENDING_ADMIN_REVIEW' && (`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `11: * Backend: GET  /admin/extended-operations/procurement/pending`
- `14: const STATUS_AR: Record<string, { ar: string; cls: string }> = {`
- `15: PENDING_ADMIN_REVIEW: { ar: 'بانتظار مراجعة الإدارة', cls: 'bg-amber-100 text-amber-700' },`
- `17: APPROVED_BY_PHARMACY: { ar: 'قبلت الصيدلية العرض', cls: 'bg-green-100 text-green-700' },`
- `18: CANCELLED: { ar: 'ملغي', cls: 'bg-red-100 text-red-700' },`
- `19: COMPLETED: { ar: 'مكتمل', cls: 'bg-green-100 text-green-700' },`
- `23: const [requests, setRequests] = useState<any[]>([]);`
- `24: const [loading, setLoading] = useState(true);`
- `25: const [error, setError] = useState('');`
- `26: const [selected, setSelected] = useState<any | null>(null);`
- `27: const [itemPrices, setItemPrices] = useState<Record<number, string>>({});`
### payment_insurance_relevance
- `8: * app; admin reviews each request here, analyzes items, and issues a price`
- `27: const [itemPrices, setItemPrices] = useState<Record<number, string>>({});`
- `31: const totalOf = (r: any) => itemsOf(r).reduce((sum: number, it: any, i: number) => {`
- `32: const unit = parseFloat(itemPrices[i] || '0') || 0;`
- `54: const total = totalOf(selected);`
- `55: if (!(total > 0)) { alert('أدخل سعر وحدة صحيح لكل صنف على الأقل'); return; }`
- `60: unit_price: parseFloat(itemPrices[i] || '0') || 0,`
- `61: line_total: (parseFloat(itemPrices[i] || '0') || 0) * (Number(it.requested_quantity || it.quantity) || 1),`
- `65: body: JSON.stringify({ pricingItems, totalPrice: total }),`
- `68: setItemPrices({});`
- `119: onClick={() => { setSelected(isOpen ? null : r); setItemPrices({}); }}`
- `146: value={itemPrices[i] || ''}`
### error_empty_loading_retry_cancel
- `11: * Backend: GET  /admin/extended-operations/procurement/pending`
- `15: PENDING_ADMIN_REVIEW: { ar: 'بانتظار مراجعة الإدارة', cls: 'bg-amber-100 text-amber-700' },`
- `18: CANCELLED: { ar: 'ملغي', cls: 'bg-red-100 text-red-700' },`
- `24: const [loading, setLoading] = useState(true);`
- `25: const [error, setError] = useState('');`
- `37: setLoading(true);`
- `38: setError('');`
- `40: const res = await apiFetch('/admin/extended-operations/procurement/pending');`
- `42: } catch (e: any) {`
- `43: setError(e?.message || 'تعذر تحميل طلبات التوريد');`
- `45: setLoading(false);`
- `71: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
