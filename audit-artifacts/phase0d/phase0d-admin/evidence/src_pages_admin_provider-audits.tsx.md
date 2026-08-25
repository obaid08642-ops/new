# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/provider-audits.tsx`
- **Member SHA-256:** `6ee1935bb2b7f82af362339c2c67e86cf9fb71801eee30106db7b3892f74ff6f`
- **Line count:** 67
- **Read range:** `1-67`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export default function ProviderAuditsPage() {`
- `58: <button onClick={() => handleApprove(d._id)} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">اعتماد التعديل</button>`
- `59: <button onClick={() => handleReject(d._id)} className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700">رفض التعديل</button>`
### backend_consumers_or_contracts
- `13: const res = await apiFetch('/admin/provider-deltas', { method: 'POST' });`
- `22: await apiFetch(`/admin/provider-deltas/${id}/approve`, { method: 'POST' });`
- `32: await apiFetch(`/admin/provider-deltas/${id}/reject`, { method: 'POST' });`
### auth_ownership
- `13: const res = await apiFetch('/admin/provider-deltas', { method: 'POST' });`
- `22: await apiFetch(`/admin/provider-deltas/${id}/approve`, { method: 'POST' });`
- `32: await apiFetch(`/admin/provider-deltas/${id}/reject`, { method: 'POST' });`
- `46: <h2 className="text-xl font-bold mb-4">الطبيب: {d.providerId?.full_name || 'طبيب'}</h2>`
### state_transitions
- `1: import { useEffect, useState } from 'react';`
- `5: const [deltas, setDeltas] = useState<any[]>([]);`
- `16: console.error(err);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `15: } catch (err) {`
- `16: console.error(err);`
- `25: } catch (err) {`
- `35: } catch (err) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
