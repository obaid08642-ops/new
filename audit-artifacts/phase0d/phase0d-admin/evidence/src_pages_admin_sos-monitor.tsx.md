# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/sos-monitor.tsx`
- **Member SHA-256:** `0e80d8bf719034cb600ed38ac5f8e2020d8123950a5522a98ae83c4b4241967c`
- **Line count:** 188
- **Read range:** `1-188`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: RESOLVED: 'تمت المعالجة', CANCELLED: 'ملغى',`
- `30: export default function SosMonitorPage() {`
- `77: const activeCount = cases.filter((c) => !['RESOLVED', 'CANCELLED'].includes(c.status || c.state || '')).length;`
- `90: <button onClick={() => load(true)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">تحديث الآن </button>`
- `98: <button onClick={() => load(true)} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">إعادة المحاولة</button>`
- `110: const isActive = !['RESOLVED', 'CANCELLED'].includes(st);`
- `138: href={`https://maps.google.com/?q=${lat},${lng}`}`
- `156: <button onClick={() => assign(c.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold">`
- `169: <button onClick={() => resolve(c.id)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold">تأكيد إنهاء الحالة</button>`
- `170: <button onClick={() => { setResolvingId(null); setResolveNotes(''); }} className="px-4 py-2 bg-slate-200 rounded-lg text-sm">تراجع</button>`
- `174: <button onClick={() => setResolvingId(c.id)} className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-bold transition-colors">`
### backend_consumers_or_contracts
- `42: const data = await apiFetch('/emergency/active');`
- `63: await apiFetch(`/emergency/${id}/assign`, { method: 'POST', body: JSON.stringify({ hospital_id }) });`
- `70: await apiFetch(`/emergency/${id}/resolve`, { method: 'POST', body: JSON.stringify({ notes: resolveNotes }) });`
### auth_ownership
- `34: const [lastRefresh, setLastRefresh] = useState<Date | null>(null);`
- `45: setLastRefresh(new Date());`
- `88: {lastRefresh && <span className="text-xs text-slate-400">آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA-u-ca-gregory')} (تحديث تلقائي كل 10 ثوانٍ)</span>}`
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `15: status?: string;`
- `16: state?: string;`
- `25: const STATUS_AR: Record<string, string> = {`
- `27: RESOLVED: 'تمت المعالجة', CANCELLED: 'ملغى',`
- `31: const [cases, setCases] = useState<SosCase[]>([]);`
- `32: const [loading, setLoading] = useState(true);`
- `33: const [error, setError] = useState<string | null>(null);`
- `34: const [lastRefresh, setLastRefresh] = useState<Date | null>(null);`
- `35: const [resolvingId, setResolvingId] = useState<string | null>(null);`
- `36: const [resolveNotes, setResolveNotes] = useState('');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: import EmptyIcon from '../../components/EmptyIcon';`
- `27: RESOLVED: 'تمت المعالجة', CANCELLED: 'ملغى',`
- `32: const [loading, setLoading] = useState(true);`
- `33: const [error, setError] = useState<string | null>(null);`
- `40: if (initial) setLoading(true);`
- `44: setError(null);`
- `46: } catch (e: any) {`
- `47: setError(e?.message || 'تعذر تحميل حالات الطوارئ');`
- `49: setLoading(false);`
- `65: } catch (e: any) { alert(e?.message || 'فشل الإسناد'); }`
- `74: } catch (e: any) { alert(e?.message || 'فشل الإنهاء'); }`
- `77: const activeCount = cases.filter((c) => !['RESOLVED', 'CANCELLED'].includes(c.status || c.state || '')).length;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
