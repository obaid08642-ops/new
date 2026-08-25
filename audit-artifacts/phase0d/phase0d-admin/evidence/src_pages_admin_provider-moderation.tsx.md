# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/provider-moderation.tsx`
- **Member SHA-256:** `a5c7d2cf77bf485a30007dcc5ce88980d41db52b79bdfb71907bd64c536c92fe`
- **Line count:** 317
- **Read range:** `1-317`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `74: // pipeline the provider app submits to via POST /provider/settings/delta)`
- `180: <button className={`px-6 py-2 font-bold ${activeTab === 'onboarding' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => { setActiveTab('onboarding'); setSelectedDelta(null); }}>`
- `183: <button className={`px-6 py-2 font-bold ${activeTab === 'deltas' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => { setActiveTab('deltas'); setSelectedProvider(null); }}>`
- `197: <div key={p.id} onClick={() => setSelectedProvider(p)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedProvider?.id === p.id ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-200 hover:border-teal-300'}`}>`
- `203: <div key={d.id} onClick={() => setSelectedDelta(d)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedDelta?.id === d.id ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-200 hover:border-amber-300'}`}>`
- `236: <button onClick={() => handleApprove(selectedProvider.id)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow transition text-lg">`
- `239: <button onClick={() => setIsModalOpen(true)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 rounded-lg shadow-sm border border-red-200 transition text-lg">`
- `280: <button onClick={() => handleCommitDelta(selectedDelta.id)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg shadow transition text-lg">`
- `283: <button onClick={() => handleRejectDelta(selectedDelta.id)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg shadow-sm border border-gray-300 transition text-lg">`
- `309: <button onClick={handleSuspend} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">تأكيد الإيقاف الحرج</button>`
- `310: <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded">تراجع</button>`
### backend_consumers_or_contracts
- `44: fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${selectedProvider.id}`)`
- `59: const providersRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers?status=pending&limit=100`);`
- `75: const deltasRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas`, { method: 'POST' });`
- `100: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });`
- `118: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${selectedProvider?.id}/suspend`, {`
- `140: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas/${id}/approve`, { method: 'POST' });`
- `157: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas/${id}/reject`, { method: 'POST' });`
- `301: <p className="text-sm text-gray-600 mb-4">هذا الإجراء سيقوم بقطع جلسات الـ Socket وإخفاء المزود فوراً من البحث.</p>`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `19: providerId: string;`
- `44: fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${selectedProvider.id}`)`
- `59: const providersRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers?status=pending&limit=100`);`
- `66: type: i.provider_type || i.role || '—',`
- `75: const deltasRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas`, { method: 'POST' });`
- `81: providerId: d.provider_id || d.account_id || '',`
- `100: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });`
- `118: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers/${selectedProvider?.id}/suspend`, {`
- `140: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas/${id}/approve`, { method: 'POST' });`
- `157: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/providers/provider-deltas/${id}/reject`, { method: 'POST' });`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `12: status?: string;`
- `22: status?: string;`
- `29: const [activeTab, setActiveTab] = useState<'onboarding' | 'deltas'>('onboarding');`
- `30: const [pendingProviders, setPendingProviders] = useState<Provider[]>([]);`
- `31: const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);`
- `33: const [pendingDeltas, setPendingDeltas] = useState<DeltaMutation[]>([]);`
- `34: const [selectedDelta, setSelectedDelta] = useState<DeltaMutation | null>(null);`
- `35: const [providerDetail, setProviderDetail] = useState<any | null>(null);`
- `36: const [detailLoading, setDetailLoading] = useState(false);`
- `42: setDetailLoading(true);`
- `47: .finally(() => setDetailLoading(false));`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `30: const [pendingProviders, setPendingProviders] = useState<Provider[]>([]);`
- `33: const [pendingDeltas, setPendingDeltas] = useState<DeltaMutation[]>([]);`
- `36: const [detailLoading, setDetailLoading] = useState(false);`
- `42: setDetailLoading(true);`
- `46: .catch(() => setProviderDetail(null))`
- `47: .finally(() => setDetailLoading(false));`
- `52: const [isLoading, setIsLoading] = useState(true);`
- `57: setIsLoading(true);`
- `58: // REAL pending provider accounts (provider_accounts, status=pending)`
- `59: const providersRes = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/providers?status=pending&limit=100`);`
- `63: setPendingProviders(items.map((i: any) => ({`
- `73: // REAL pending delta mutations (provider_deltas collection — the same`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
