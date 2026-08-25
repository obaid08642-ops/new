# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/disputes.tsx`
- **Member SHA-256:** `d7e3e700b3689f78d9cdcebfef4fdafe44494b8916eed65b5d43b3101cc1c325`
- **Line count:** 143
- **Read range:** `1-143`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: status: 'PENDING' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';`
- `16: export default function DisputeResolutionPage() {`
- `44: const handleResolve = async (id: string, action: 'refund' | 'reject') => {`
- `48: await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `56: alert(action === 'refund' ? 'تمت الموافقة على الاسترداد المالي وإغلاق النزاع' : 'تم رفض طلب النزاع وتأكيد العملية');`
- `76: onClick={fetchDisputes}`
- `121: onClick={() => handleResolve(item.id, 'refund')}`
- `127: onClick={() => handleResolve(item.id, 'reject')}`
### backend_consumers_or_contracts
- `30: const res = await fetch(`${API_BASE}/api/v1/admin/disputes`, {`
- `48: await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
### auth_ownership
- `29: const token = localStorage.getItem('admin_token');`
- `30: const res = await fetch(`${API_BASE}/api/v1/admin/disputes`, {`
- `31: headers: { Authorization: `Bearer ${token}` }`
- `47: const token = localStorage.getItem('admin_token');`
- `48: await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `52: Authorization: `Bearer ${token}``
- `54: body: JSON.stringify({ reason: `Admin dispute resolution: ${action}` })`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `3: import EmptyIcon from '../../components/EmptyIcon';`
- `12: status: 'PENDING' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';`
- `17: const [disputes, setDisputes] = useState<DisputeItem[]>([]);`
- `18: const [loading, setLoading] = useState(true);`
- `19: const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);`
- `27: setLoading(true);`
- `38: console.error('Failed to fetch disputes', e);`
- `40: setLoading(false);`
- `44: const handleResolve = async (id: string, action: 'refund' | 'reject') => {`
- `48: await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `56: alert(action === 'refund' ? 'تمت الموافقة على الاسترداد المالي وإغلاق النزاع' : 'تم رفض طلب النزاع وتأكيد العملية');`
### payment_insurance_relevance
- `12: status: 'PENDING' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';`
- `44: const handleResolve = async (id: string, action: 'refund' | 'reject') => {`
- `56: alert(action === 'refund' ? 'تمت الموافقة على الاسترداد المالي وإغلاق النزاع' : 'تم رفض طلب النزاع وتأكيد العملية');`
- `121: onClick={() => handleResolve(item.id, 'refund')}`
### error_empty_loading_retry_cancel
- `3: import EmptyIcon from '../../components/EmptyIcon';`
- `12: status: 'PENDING' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';`
- `18: const [loading, setLoading] = useState(true);`
- `27: setLoading(true);`
- `37: } catch (e) {`
- `38: console.error('Failed to fetch disputes', e);`
- `40: setLoading(false);`
- `48: await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {`
- `58: } catch (e) {`
- `83: {loading ? (`
- `87: <EmptyIcon name="shield" size={44} color="#0D9488" className="mb-3 mx-auto" />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
