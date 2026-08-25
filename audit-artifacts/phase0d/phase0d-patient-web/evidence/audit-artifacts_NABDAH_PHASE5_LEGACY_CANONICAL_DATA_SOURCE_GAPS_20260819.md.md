# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_LEGACY_CANONICAL_DATA_SOURCE_GAPS_20260819.md`
- **Member SHA-256:** `3a6828968bbcb517501e3fe0041502959500df28615707e19cf30c34774982c5`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Pharmacy orders, allocations and broadcasts deliberately coexist with canonical order/system-event state | `pharmacy_orders` runs alongside `orders`; allocation/broadcast side tables are bridged through mapping/event conventions.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Backend contains an admin-protected, read-only legacy report and usage map. It does not delete collections as part of the report path. This is appropriate as an inventory mechanism.`
- `14: | **P1** | Static usage map can drift from active code paths | Reader/writer lists are manually maintained and endpoint only describes selected collections. | Generate usage inventory in CI or add contract ownership manifests reviewed with `
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed risks`
- `11: | **P0** | Pharmacy orders, allocations and broadcasts deliberately coexist with canonical order/system-event state | `pharmacy_orders` runs alongside `orders`; allocation/broadcast side tables are bridged through mapping/event conventions.`
- `13: | **P1** | Legacy inventory uses estimated document counts only | `estimatedDocumentCount` is useful for overview but cannot prove record-level parity, orphan rate, state divergence or migration safety. | Produce exact reconciliation metric`
- `18: Canonical/legacy coexistence is **P0 FIX/BLOCKED** for cross-app state truthfulness. No destructive migration is authorized until exact reconciliation, source-of-truth selection, invariant tests and rollback evidence are complete.`
### payment_insurance_relevance
- `11: | **P0** | Pharmacy orders, allocations and broadcasts deliberately coexist with canonical order/system-event state | `pharmacy_orders` runs alongside `orders`; allocation/broadcast side tables are bridged through mapping/event conventions.`
### error_empty_loading_retry_cancel
- `11: | **P0** | Pharmacy orders, allocations and broadcasts deliberately coexist with canonical order/system-event state | `pharmacy_orders` runs alongside `orders`; allocation/broadcast side tables are bridged through mapping/event conventions.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
