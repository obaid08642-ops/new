# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/legal-policies.tsx`
- **Member SHA-256:** `0eb0411e947d211b072afc2ba09ddd73037277d753cc938e8544c8b0ec0ea292`
- **Line count:** 132
- **Read range:** `1-132`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export default function LegalPoliciesPage() {`
- `102: <button onClick={() => openEdit(p.key)} className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">`
- `111: <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setEditing(null)}>`
- `112: <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()} dir="rtl">`
- `122: <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">`
- `125: <button onClick={() => setEditing(null)} className="bg-gray-100 px-6 py-2 rounded-lg">إلغاء</button>`
### backend_consumers_or_contracts
- `13: apiFetch('/legal/policies').catch(() => []),`
- `14: apiFetch('/admin/finance/commissions').catch(() => null),`
- `22: const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `29: await apiFetch(`/admin/legal/policy/${editing}`, {`
- `40: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ service_types: next }) }).catch(() => null);`
- `45: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ payout_schedule: { ...commissions.payout_schedule, minimum_payout_sar: value } }) }).catch(() => null);`
### auth_ownership
- `14: apiFetch('/admin/finance/commissions').catch(() => null),`
- `29: await apiFetch(`/admin/legal/policy/${editing}`, {`
- `31: body: JSON.stringify({ content_ar: editContent, change_note: 'admin edit from dashboard' }),`
- `40: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ service_types: next }) }).catch(() => null);`
- `45: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ payout_schedule: { ...commissions.payout_schedule, minimum_payout_sar: value } }) }).catch(() => null);`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `5: const [policies, setPolicies] = useState<any[]>([]);`
- `6: const [commissions, setCommissions] = useState<any>(null);`
- `7: const [editing, setEditing] = useState<string | null>(null);`
- `8: const [editContent, setEditContent] = useState('');`
- `9: const [saving, setSaving] = useState(false);`
### payment_insurance_relevance
- `45: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ payout_schedule: { ...commissions.payout_schedule, minimum_payout_sar: value } }) }).catch(() => null);`
- `77: type="number" min="0" defaultValue={commissions.payout_schedule?.minimum_payout_sar}`
- `84: الجدول: {commissions.payout_schedule?.frequency} ({commissions.payout_schedule?.day}) · معالجة {commissions.payout_schedule?.processing_days} أيام`
- `86: <div className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded">VAT {commissions.tax?.vat_percent}% على العمولة</div>`
### error_empty_loading_retry_cancel
- `13: apiFetch('/legal/policies').catch(() => []),`
- `14: apiFetch('/admin/finance/commissions').catch(() => null),`
- `22: const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `32: }).catch(() => alert('فشل الحفظ'));`
- `40: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ service_types: next }) }).catch(() => null);`
- `45: await apiFetch('/admin/finance/commissions', { method: 'PUT', body: JSON.stringify({ payout_schedule: { ...commissions.payout_schedule, minimum_payout_sar: value } }) }).catch(() => null);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
