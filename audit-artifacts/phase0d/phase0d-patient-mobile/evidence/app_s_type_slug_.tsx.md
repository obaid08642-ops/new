# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/s/[type]/[slug].tsx`
- **Member SHA-256:** `b300425b6ad43cde9589a9cbb210bb98b50a477470c0145449e86e7e5831fdc2`
- **Line count:** 58
- **Read range:** `1-58`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * M6 / ER-12: universal-link catcher for public SEO pages.`
- `5: * backend SEO service and forwards to the matching in-app screen.`
- `10: import { useLocalSearchParams, router } from 'expo-router';`
- `14: const TYPE_ROUTE = {`
- `33: const factory = TYPE_ROUTE[String(type)];`
- `35: router.replace(factory(id));`
- `48: router.replace({ pathname: '/search', params: { q: String(slug || '').replace(/-/g, ' ') } });`
### backend_consumers_or_contracts
- `15: medicine: (id) => ({ pathname: '/pharmacy/product-detail', params: { id } }),`
- `19: 'home-care-service': (id) => ({ pathname: '/nursing', params: { serviceId: id } }),`
- `30: const entity = await apiFetch(`/seo/resolve/${type}/${encodeURIComponent(String(slug))}`);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: import React, { useEffect, useState } from 'react';`
- `24: const [err, setErr] = useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: * M6 / ER-12: universal-link catcher for public SEO pages.`
- `22: export default function PublicLinkCatcher() {`
- `39: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
