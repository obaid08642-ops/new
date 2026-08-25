# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/insurance-companies.tsx`
- **Member SHA-256:** `8873703f8a59172e4143fb0137dabc030a714bc0b882a1e1790f517d1199d023`
- **Line count:** 278
- **Read range:** `1-278`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: export default function InsuranceCompaniesPage() {`
- `160: onClick={() => setShowAdd(!showAdd)}`
- `183: <button onClick={addCompany} disabled={busy === 'add'} className="bg-teal-600 text-white font-bold px-6 py-2 rounded-xl disabled:opacity-50">`
- `199: <button onClick={() => setExpanded(isOpen ? null : id)} className="text-slate-400 w-6">{isOpen ? '▾' : '◂'}</button>`
- `205: <button onClick={saveEdit} disabled={busy === id} className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded">حفظ</button>`
- `206: <button onClick={() => setEditId(null)} className="text-xs text-slate-500 px-2">إلغاء</button>`
- `219: onClick={() => { setEditId(id); setEditNameAr(c.name_ar || ''); setEditNameEn(c.name_en || ''); }}`
- `225: onClick={toggleActive}`
- `238: onClick={() => { setTierCompany(tierCompany === id ? null : id); setTierCode(''); setTierNameAr(''); setTierNameEn(''); }}`
- `251: <button onClick={addTier} disabled={busy === id} className="bg-teal-600 text-white text-sm font-bold px-4 py-1.5 rounded disabled:opacity-50">حفظ الفئة</button>`
- `263: <button onClick={() => removeTier(id, t)} disabled={busy === (t.id || t._id)} className="text-red-500 hover:text-red-700 font-bold" title="حذف الفئة">×</button>`
### backend_consumers_or_contracts
- `12: * Backend: GET /insurance/companies/all · POST /insurance/companies`
- `13: *          PATCH /insurance/companies/:id`
- `14: *          POST /insurance/companies/:id/networks`
- `15: *          DELETE /insurance/companies/:id/networks/:networkId`
- `46: const res = await apiFetch('/insurance/companies/all');`
- `61: await apiFetch(`/insurance/companies/${id}`, {`
- `80: await apiFetch('/insurance/companies', {`
- `98: await apiFetch(`/insurance/companies/${editId}`, {`
- `118: await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `141: await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useEffect, useState, useCallback } from 'react';`
- `18: const [companies, setCompanies] = useState<any[]>([]);`
- `19: const [loading, setLoading] = useState(true);`
- `20: const [error, setError] = useState('');`
- `21: const [expanded, setExpanded] = useState<string | null>(null);`
- `22: const [busy, setBusy] = useState<string | null>(null);`
- `25: const [showAdd, setShowAdd] = useState(false);`
- `26: const [newCode, setNewCode] = useState('');`
- `27: const [newNameAr, setNewNameAr] = useState('');`
- `28: const [newNameEn, setNewNameEn] = useState('');`
- `31: const [editId, setEditId] = useState<string | null>(null);`
- `32: const [editNameAr, setEditNameAr] = useState('');`
### payment_insurance_relevance
- `6: * Insurance companies directory management:`
- `12: * Backend: GET /insurance/companies/all · POST /insurance/companies`
- `13: *          PATCH /insurance/companies/:id`
- `14: *          POST /insurance/companies/:id/networks`
- `15: *          DELETE /insurance/companies/:id/networks/:networkId`
- `17: export default function InsuranceCompaniesPage() {`
- `46: const res = await apiFetch('/insurance/companies/all');`
- `61: await apiFetch(`/insurance/companies/${id}`, {`
- `80: await apiFetch('/insurance/companies', {`
- `98: await apiFetch(`/insurance/companies/${editId}`, {`
- `118: await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `141: await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = useState(true);`
- `20: const [error, setError] = useState('');`
- `43: setLoading(true);`
- `44: setError('');`
- `48: } catch (e: any) {`
- `49: setError(e?.message || 'تعذر تحميل شركات التأمين');`
- `51: setLoading(false);`
- `66: } catch (e: any) {`
- `87: } catch (e: any) {`
- `104: } catch (e: any) {`
- `130: } catch (e: any) {`
- `143: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
