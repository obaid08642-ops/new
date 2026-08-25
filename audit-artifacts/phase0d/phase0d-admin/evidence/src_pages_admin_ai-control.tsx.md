# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/ai-control.tsx`
- **Member SHA-256:** `805cde84ec9cd497069d7f0adac44c29644714bb27d572dcd5d0053936f51459`
- **Line count:** 148
- **Read range:** `1-148`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: openrouter: { label: 'OpenRouter', color: '#B84FC7' },`
- `15: export default function AiControlPage() {`
- `53: onClick={() => setMode('auto')}`
- `95: onClick={() => toggle(p.key, p.enabled)}`
### backend_consumers_or_contracts
- `23: apiFetch('/ai/admin/gateway').catch(() => null),`
- `24: apiFetch(`/ai/admin/usage?days=${days}`).catch(() => []),`
- `33: await apiFetch(`/ai/admin/gateway/provider/${key}`, { method: 'POST', body: JSON.stringify({ enabled: !enabled }) }).catch(() => null);`
- `39: await apiFetch('/ai/admin/gateway/mode', { method: 'POST', body: JSON.stringify({ mode, pinned }) }).catch(() => null);`
### auth_ownership
- `23: apiFetch('/ai/admin/gateway').catch(() => null),`
- `24: apiFetch(`/ai/admin/usage?days=${days}`).catch(() => []),`
- `33: await apiFetch(`/ai/admin/gateway/provider/${key}`, { method: 'POST', body: JSON.stringify({ enabled: !enabled }) }).catch(() => null);`
- `39: await apiFetch('/ai/admin/gateway/mode', { method: 'POST', body: JSON.stringify({ mode, pinned }) }).catch(() => null);`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `16: const [data, setData] = useState<any>(null);`
- `17: const [usage, setUsage] = useState<any[]>([]);`
- `18: const [days, setDays] = useState(7);`
- `19: const [busy, setBusy] = useState<string | null>(null);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `23: apiFetch('/ai/admin/gateway').catch(() => null),`
- `24: apiFetch(`/ai/admin/usage?days=${days}`).catch(() => []),`
- `33: await apiFetch(`/ai/admin/gateway/provider/${key}`, { method: 'POST', body: JSON.stringify({ enabled: !enabled }) }).catch(() => null);`
- `39: await apiFetch('/ai/admin/gateway/mode', { method: 'POST', body: JSON.stringify({ mode, pinned }) }).catch(() => null);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
