# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityLeaveRequestsScreen.tsx`
- **Member SHA-256:** `0185d7bf6ae37fe566b60774b50e32c80d8eaf82916dd61ce2836648ae7ee562`
- **Line count:** 105
- **Read range:** `1-105`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: export function FacilityLeaveRequestsScreen({ onBack }: { onBack: () => void }) {`
- `84: onPress={() => handleAction(req.id, 'rejected')}`
- `90: onPress={() => handleAction(req.id, 'approved')}`
### backend_consumers_or_contracts
- `6: import { ProviderApi } from '../../api/provider';`
- `19: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `16: status: 'pending' | 'approved' | 'rejected';`
- `23: const [requests, setRequests] = useState<LeaveRequest[]>([]);`
- `24: const [loading, setLoading] = useState(true);`
- `32: setLoading(true);`
- `36: console.warn('Failed to fetch leave requests', e);`
- `38: setLoading(false);`
- `42: const handleAction = async (id: string, action: 'approved' | 'rejected') => {`
- `45: setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: action } : r));`
- `46: show(AR ? `تم ${action === 'approved' ? 'قبول' : 'رفض'} الطلب` : `Request ${action}`, 'success');`
- `48: show(AR ? 'حدث خطأ' : 'An error occurred', 'error');`
- `71: label={req.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : req.status === 'approved' ? (AR ? 'مقبول' : 'Approved') : (AR ? 'مرفوض' : 'Rejected')}`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBadge, NBtn, NScroll } from '../../components/ui';`
- `58: <NCard key={req.id}>`
- `94: </NCard>`
### error_empty_loading_retry_cancel
- `16: status: 'pending' | 'approved' | 'rejected';`
- `24: const [loading, setLoading] = useState(true);`
- `32: setLoading(true);`
- `35: } catch (e) {`
- `36: console.warn('Failed to fetch leave requests', e);`
- `38: setLoading(false);`
- `47: } catch (e) {`
- `48: show(AR ? 'حدث خطأ' : 'An error occurred', 'error');`
- `71: label={req.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : req.status === 'approved' ? (AR ? 'مقبول' : 'Approved') : (AR ? 'مرفوض' : 'Rejected')}`
- `72: variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}`
- `76: {req.status === 'pending' && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
