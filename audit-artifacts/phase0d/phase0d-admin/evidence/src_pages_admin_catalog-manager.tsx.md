# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/catalog-manager.tsx`
- **Member SHA-256:** `2ac31fe58d9b9dbe5c35fa03ffcac7053a7e6b615a9c36ba359ba82d1046b773`
- **Line count:** 186
- **Read range:** `1-186`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `37: export default function CatalogManagerPage() {`
- `116: <button key={t.key} onClick={() => setTab(t.key)}`
- `123: <button onClick={() => setEditing({ active: true })} style={{ padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#0F172A', color: '#fff' }}>`
- `144: <button onClick={() => setEditing({ ...item })} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>تعديل</button>`
- `145: <button onClick={() => remove(item)} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>حذف</button>`
- `154: onClick={() => setEditing(null)}>`
- `156: onClick={(e) => e.stopPropagation()}>`
- `176: <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>إلغاء</button>`
- `177: <button onClick={save} disabled={saving} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#23B5CE', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>`
### backend_consumers_or_contracts
- `7: * Labs:     GET /labs/services        POST|PUT|DELETE /labs/admin/catalog[/:id]`
- `8: * Radiology:GET /radiology/services   POST|PUT|DELETE /radiology/admin/catalog[/:id]`
- `9: * Nursing:  GET /nursing/catalog      POST|PUT|DELETE /nursing/admin/catalog[/:id]`
- `15: { key: 'labs', label: 'التحاليل', listUrl: '/labs/services', adminBase: '/labs/admin/catalog' },`
- `16: { key: 'packages', label: 'الباقات', listUrl: '/labs/packages', adminBase: '/labs/admin/catalog' },`
- `17: { key: 'radiology', label: 'الأشعة', listUrl: '/radiology/services', adminBase: '/radiology/admin/catalog' },`
- `18: { key: 'nursing', label: 'التمريض المنزلي', listUrl: '/nursing/catalog', adminBase: '/nursing/admin/catalog' },`
- `51: const rows = await apiFetch(tabCfg.listUrl);`
- `84: await apiFetch(tabCfg.adminBase, { method: 'POST', body: JSON.stringify(body) });`
- `86: await apiFetch(`${tabCfg.adminBase}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });`
- `101: await apiFetch(`${tabCfg.adminBase}/${item.id}`, { method: 'DELETE' });`
### auth_ownership
- `7: * Labs:     GET /labs/services        POST|PUT|DELETE /labs/admin/catalog[/:id]`
- `8: * Radiology:GET /radiology/services   POST|PUT|DELETE /radiology/admin/catalog[/:id]`
- `9: * Nursing:  GET /nursing/catalog      POST|PUT|DELETE /nursing/admin/catalog[/:id]`
- `14: const TABS: { key: TabKey; label: string; listUrl: string; adminBase: string }[] = [`
- `15: { key: 'labs', label: 'التحاليل', listUrl: '/labs/services', adminBase: '/labs/admin/catalog' },`
- `16: { key: 'packages', label: 'الباقات', listUrl: '/labs/packages', adminBase: '/labs/admin/catalog' },`
- `17: { key: 'radiology', label: 'الأشعة', listUrl: '/radiology/services', adminBase: '/radiology/admin/catalog' },`
- `18: { key: 'nursing', label: 'التمريض المنزلي', listUrl: '/nursing/catalog', adminBase: '/nursing/admin/catalog' },`
- `84: await apiFetch(tabCfg.adminBase, { method: 'POST', body: JSON.stringify(body) });`
- `86: await apiFetch(`${tabCfg.adminBase}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });`
- `101: await apiFetch(`${tabCfg.adminBase}/${item.id}`, { method: 'DELETE' });`
### state_transitions
- `1: import React, { useEffect, useMemo, useState } from 'react';`
- `38: const [tab, setTab] = useState<TabKey>('labs');`
- `39: const [items, setItems] = useState<any[]>([]);`
- `40: const [loading, setLoading] = useState(false);`
- `41: const [search, setSearch] = useState('');`
- `42: const [editing, setEditing] = useState<any | null>(null); // {} = new item`
- `43: const [saving, setSaving] = useState(false);`
- `44: const [msg, setMsg] = useState('');`
- `49: setLoading(true);`
- `56: setLoading(false);`
- `132: {loading && <p>جارٍ التحميل…</p>}`
- `150: {!loading && filtered.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', marginTop: 40 }}>لا توجد أصناف مطابقة.</p>}`
### payment_insurance_relevance
- `26: { key: 'price', label: 'السعر (ر.س)', type: 'number' },`
- `27: { key: 'old_price', label: 'السعر قبل الخصم', type: 'number' },`
- `141: <div style={{ fontSize: 13, fontWeight: 700, color: '#23B5CE', marginTop: 4 }}>{item.price} ر.س</div>`
### error_empty_loading_retry_cancel
- `40: const [loading, setLoading] = useState(false);`
- `49: setLoading(true);`
- `53: } catch (e: any) {`
- `56: setLoading(false);`
- `91: } catch (e: any) {`
- `104: } catch (e: any) {`
- `132: {loading && <p>جارٍ التحميل…</p>}`
- `150: {!loading && filtered.length === 0 && <p style={{ color: '#94A3B8', textAlign: 'center', marginTop: 40 }}>لا توجد أصناف مطابقة.</p>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
