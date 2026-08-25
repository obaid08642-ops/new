# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_SERVICE_CATALOG_GAPS_20260819.md`
- **Member SHA-256:** `13aff8da208bb2abbc69562c0b867d956d89cd5465383883828b77e3bced6382`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: | **P1** | Delete is a browser-confirm destructive action with no impact analysis | The button sends DELETE after one confirm, without showing affected bookings, orders, insurance mappings, provider configurations, historical records, soft-`
- `9: | **P1** | Service images use arbitrary external URLs | Form accepts any `image_url` labelled Cloudinary, without upload validation, domain allowlist, content moderation, provenance or lifecycle control. | Use approved owned media storage/r`
- `11: | **P1** | Error styling and empty state can misrepresent operational result | The same green message styling is used for save/delete/load failure messages; load failures leave prior/empty data with no independent stale/retry state. | Rende`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — service catalog management gaps`
- `7: | **P0** | A generic one-step form can immediately alter patient-facing clinical services, price, result time and availability | Admin can create/edit/delete laboratory, package, radiology and nursing services with price, turnaround, active`
- `16: Service catalog administration is **P0 FIX/BLOCKED**. It must not directly publish price, medical-service, turnaround or availability changes until catalog governance and dependent operational validation are implemented.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | A generic one-step form can immediately alter patient-facing clinical services, price, result time and availability | Admin can create/edit/delete laboratory, package, radiology and nursing services with price, turnaround, active`
- `8: | **P1** | Delete is a browser-confirm destructive action with no impact analysis | The button sends DELETE after one confirm, without showing affected bookings, orders, insurance mappings, provider configurations, historical records, soft-`
- `9: | **P1** | Service images use arbitrary external URLs | Form accepts any `image_url` labelled Cloudinary, without upload validation, domain allowlist, content moderation, provenance or lifecycle control. | Use approved owned media storage/r`
- `11: | **P1** | Error styling and empty state can misrepresent operational result | The same green message styling is used for save/delete/load failure messages; load failures leave prior/empty data with no independent stale/retry state. | Rende`
### payment_insurance_relevance
- `7: | **P0** | A generic one-step form can immediately alter patient-facing clinical services, price, result time and availability | Admin can create/edit/delete laboratory, package, radiology and nursing services with price, turnaround, active`
- `8: | **P1** | Delete is a browser-confirm destructive action with no impact analysis | The button sends DELETE after one confirm, without showing affected bookings, orders, insurance mappings, provider configurations, historical records, soft-`
- `10: | **P1** | Numerical/free-text fields have no authoritative client guidance or workflow validation | Price, old price, popularity, turnaround, short code and descriptions are generic text/number fields; packages lack visible component/servi`
- `16: Service catalog administration is **P0 FIX/BLOCKED**. It must not directly publish price, medical-service, turnaround or availability changes until catalog governance and dependent operational validation are implemented.`
### error_empty_loading_retry_cancel
- `11: | **P1** | Error styling and empty state can misrepresent operational result | The same green message styling is used for save/delete/load failure messages; load failures leave prior/empty data with no independent stale/retry state. | Rende`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
