# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/components/PublicDirectory.tsx`
- **Member SHA-256:** `33c310d4f7441358adbb580301e7f4972102bdb443e6d809a4bac89fe893e960`
- **Line count:** 130
- **Read range:** `1-130`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `64: <link rel="canonical" href={`${SITE}/${CANONICAL_PATH[config.type] || config.type}`} />`
- `71: <div dir="rtl" className="min-h-screen bg-slate-50">`
- `74: <Link href="/" className="text-xl font-black text-teal-700">نبض</Link>`
- `75: <Link href="/" className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg"> التطبيق</Link>`
- `98: href={`/s/${config.type}/${slug}`}`
### backend_consumers_or_contracts
- `123: const r = await fetch(`${API_BASE}/api/v1${endpoint}`, { headers: { Accept: 'application/json' } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `51: const [q, setQ] = useState('');`
- `102: {(e.image || e.avatar) && <img src={e.image || e.avatar} alt={name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `102: {(e.image || e.avatar) && <img src={e.image || e.avatar} alt={name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />}`
- `127: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
