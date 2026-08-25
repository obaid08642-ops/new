# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_CONTRACT_INVENTORY_V4_20260819.json`
- **Member SHA-256:** `33a0bc05e0388b4f6243924a4639c7da64093a3d12c5656773861c128a121e99`
- **Line count:** 13720
- **Read range:** `1-13720`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: "backend_route_count": 1342,`
- `20: "backend_routes": [`
- `23: "route": "/admin/referrals/report",`
- `29: "route": "/admin/loyalty/overview",`
- `35: "route": "/admin/users/:userId/overview",`
- `41: "route": "/admin/disputes",`
- `47: "route": "/admin/users",`
- `53: "route": "/admin/users/stats",`
- `59: "route": "/admin/sub-admins",`
- `65: "route": "/admin/sub-admins",`
- `71: "route": "/admin/sub-admins/:userId",`
- `77: "route": "/admin/sub-admins/:userId",`
### backend_consumers_or_contracts
- `3: "method": "Static API-call and Nest decorator inventory v4. It associates each decorator with the preceding Controller and supports string and array controller aliases. It normalizes origin, /api/v1 prefix, query strings and dynamic path se`
- `137: "route": "/admin/authority/appointments/:id/force-cancel",`
- `143: "route": "/admin/authority/appointments/:id/force-confirm",`
- `149: "route": "/admin/authority/appointments/:id/force-reschedule",`
- `155: "route": "/admin/authority/orders/:id/force-cancel",`
- `161: "route": "/admin/authority/orders/:id/force-complete",`
- `167: "route": "/admin/authority/orders/:id/force-reassign",`
- `173: "route": "/admin/authority/labs/:id/force-cancel",`
- `179: "route": "/admin/authority/labs/:id/force-complete",`
- `185: "route": "/admin/authority/labs/:id/override-insurance",`
- `191: "route": "/admin/authority/radiology/:id/force-cancel",`
- `197: "route": "/admin/authority/radiology/:id/force-complete",`
### auth_ownership
- `3: "method": "Static API-call and Nest decorator inventory v4. It associates each decorator with the preceding Controller and supports string and array controller aliases. It normalizes origin, /api/v1 prefix, query strings and dynamic path se`
- `15: "admin": {`
- `23: "route": "/admin/referrals/report",`
- `24: "source_file": "modules/admin/admin.controller.ts",`
- `29: "route": "/admin/loyalty/overview",`
- `30: "source_file": "modules/admin/admin.controller.ts",`
- `35: "route": "/admin/users/:userId/overview",`
- `36: "source_file": "modules/admin/admin.controller.ts",`
- `41: "route": "/admin/disputes",`
- `42: "source_file": "modules/admin/admin.controller.ts",`
- `47: "route": "/admin/users",`
- `48: "source_file": "modules/admin/admin.controller.ts",`
### state_transitions
- `3: "method": "Static API-call and Nest decorator inventory v4. It associates each decorator with the preceding Controller and supports string and array controller aliases. It normalizes origin, /api/v1 prefix, query strings and dynamic path se`
- `137: "route": "/admin/authority/appointments/:id/force-cancel",`
- `155: "route": "/admin/authority/orders/:id/force-cancel",`
- `173: "route": "/admin/authority/labs/:id/force-cancel",`
- `191: "route": "/admin/authority/radiology/:id/force-cancel",`
- `389: "route": "/admin/extended-operations/procurement/pending",`
- `431: "route": "/admin/finance/withdrawals/pending",`
- `659: "route": "/approval-workflow/requests/pending",`
- `737: "route": "/articles/bookmarks/:slug/status",`
- `941: "route": "/booking/flow/status/:type/:id",`
- `953: "route": "/booking/flow/retry/:type/:id",`
- `1037: "route": "/care/appointments/:id/cancel",`
### payment_insurance_relevance
- `185: "route": "/admin/authority/labs/:id/override-insurance",`
- `203: "route": "/admin/authority/radiology/:id/override-insurance",`
- `911: "route": "/billing/invoice/:kind/:bookingId",`
- `917: "route": "/billing/invoice/:kind/:bookingId/pdf",`
- `923: "route": "/billing/invoice/:kind/:bookingId/email",`
- `965: "route": "/booking/flow/invoice/:type/:id",`
- `971: "route": "/booking/flow/payment/:type/:id",`
- `977: "route": "/booking/flow/payment/:type/:id/mark",`
- `1091: "route": "/care/insurance",`
- `1559: "route": "/scorecard",`
- `1577: "route": "/family-cards",`
- `1691: "route": "/refunds",`
### error_empty_loading_retry_cancel
- `137: "route": "/admin/authority/appointments/:id/force-cancel",`
- `155: "route": "/admin/authority/orders/:id/force-cancel",`
- `173: "route": "/admin/authority/labs/:id/force-cancel",`
- `191: "route": "/admin/authority/radiology/:id/force-cancel",`
- `389: "route": "/admin/extended-operations/procurement/pending",`
- `431: "route": "/admin/finance/withdrawals/pending",`
- `659: "route": "/approval-workflow/requests/pending",`
- `953: "route": "/booking/flow/retry/:type/:id",`
- `1037: "route": "/care/appointments/:id/cancel",`
- `1451: "route": "/community/admin/pending",`
- `1529: "route": "/broadcast/:id/cancel",`
- `2501: "route": "/drivers/offline",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
