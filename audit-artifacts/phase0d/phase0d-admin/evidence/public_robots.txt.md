# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `public/robots.txt`
- **Member SHA-256:** `90783e33b8606530299560dd6aa514b994e990180852403234ea8094d83822d9`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: Disallow: /login`
### backend_consumers_or_contracts
- `8: Allow: /home-care-services`
- `12: Disallow: /api/`
- `14: Sitemap: https://api.nabd.plus/api/v1/seo/sitemap.xml`
### auth_ownership
- `10: Disallow: /admin/`
- `11: Disallow: /login`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
