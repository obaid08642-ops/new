# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/support-tickets.tsx`
- **Member SHA-256:** `dc68a820ac9f7195fcb92b07f85ceecf0d477772ef1491227cd3739a80236236`
- **Line count:** 146
- **Read range:** `1-146`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: export default function SupportTicketsPage() {`
- `65: onClick={() => setFilter(s)}`
- `72: <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">تحديث </button>`
- `105: <button onClick={() => setStatus(t.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">بدء المعالجة</button>`
- `108: <button onClick={() => setStatus(t.id, 'RESOLVED')} className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold">حلّها</button>`
- `110: <button onClick={() => setOpenId(isOpen ? null : t.id)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold">`
- `134: <button onClick={() => sendReply(t.id)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold">إرسال</button>`
### backend_consumers_or_contracts
- `30: const data = await apiFetch(`/support/admin/requests${filter ? `?status=${filter}` : ''}`);`
- `43: await apiFetch(`/support/admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });`
- `51: await apiFetch(`/support/requests/${id}/reply`, { method: 'POST', body: JSON.stringify({ message: replyText.trim() }) });`
### auth_ownership
- `7: * M5: support tickets admin — list (GET /support/admin/requests),`
- `9: * status transitions (PATCH /support/admin/requests/:id).`
- `30: const data = await apiFetch(`/support/admin/requests${filter ? `?status=${filter}` : ''}`);`
- `43: await apiFetch(`/support/admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });`
- `100: {t.user_name || t.user_phone || t.user_id} · {t.source_role === 'provider' ? 'مزود' : 'مريض'} · {t.category} · {new Date(t.createdAt).toLocaleString('ar-SA-u-ca-gregory')}`
- `120: <div key={i} className={`rounded-xl p-3 text-sm max-w-[80%] ${m.role === 'admin' ? 'bg-teal-50 mr-auto' : 'bg-slate-100'}`}>`
- `121: <div className="text-[10px] text-slate-400 mb-1">{m.role === 'admin' ? 'الدعم' : 'المستخدم'} · {new Date(m.at).toLocaleString('ar-SA-u-ca-gregory')}</div>`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `9: * status transitions (PATCH /support/admin/requests/:id).`
- `11: const STATUS_AR: Record<string, { ar: string; cls: string }> = {`
- `19: const [tickets, setTickets] = useState<any[]>([]);`
- `20: const [filter, setFilter] = useState('');`
- `21: const [loading, setLoading] = useState(true);`
- `22: const [error, setError] = useState<string | null>(null);`
- `23: const [openId, setOpenId] = useState<string | null>(null);`
- `24: const [replyText, setReplyText] = useState('');`
- `27: setLoading(true);`
- `28: setError(null);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `21: const [loading, setLoading] = useState(true);`
- `22: const [error, setError] = useState<string | null>(null);`
- `27: setLoading(true);`
- `28: setError(null);`
- `32: } catch (e: any) {`
- `33: setError(e?.message || 'تعذر تحميل التذاكر');`
- `35: setLoading(false);`
- `45: } catch (e: any) { alert(e?.message || 'فشل تحديث الحالة'); }`
- `54: } catch (e: any) { alert(e?.message || 'فشل إرسال الرد'); }`
- `75: {loading ? (`
- `77: ) : error ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
