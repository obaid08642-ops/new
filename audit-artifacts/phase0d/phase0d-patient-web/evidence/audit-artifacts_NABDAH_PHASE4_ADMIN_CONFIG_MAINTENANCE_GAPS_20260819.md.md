# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_CONFIG_MAINTENANCE_GAPS_20260819.md`
- **Member SHA-256:** `e59147f04a8e531bf190f66f87f0e8eb4f0c7aa145511914b61743afab853245`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Emergency-maintenance Controller has no authentication/role guard | `AdminGovernanceController` declares neither JWT nor admin/permission enforcement on the kill-switch, fraud-alert or audit-log routes. | Apply explicit authentic`
- `8: | **P0** | Kill-switch trusts caller-supplied admin identity and does not activate infrastructure flag | UI hard-codes `admin-master-001`; Controller writes it as `last_modified_by_admin_id` and Redis flag write is commented out. The UI can`
- `9: | **P0** | SLA update UI shows success without checking HTTP response | `handleUpdateSLA` awaits the request but never tests `res.ok`/returned normalized config; failed/rejected persistence can be declared globally overridden. | Validate se`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — configuration and emergency-maintenance gaps`
- `7: | **P0** | Emergency-maintenance Controller has no authentication/role guard | `AdminGovernanceController` declares neither JWT nor admin/permission enforcement on the kill-switch, fraud-alert or audit-log routes. | Apply explicit authentic`
- `8: | **P0** | Kill-switch trusts caller-supplied admin identity and does not activate infrastructure flag | UI hard-codes `admin-master-001`; Controller writes it as `last_modified_by_admin_id` and Redis flag write is commented out. The UI can`
- `12: | **P1** | Fraud/audit comments make unsupported immutable/ABAC claims | Same unguarded Controller calls plain `find().limit(100)` despite claims of strict immutable/ABAC access. | Remove unsupported claims or implement read authorization, `
- `17: Admin configuration and maintenance control is **P0 FIX/BLOCKED**. The current implementation must not be used to alter production SLA or emergency platform availability.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Emergency-maintenance Controller has no authentication/role guard | `AdminGovernanceController` declares neither JWT nor admin/permission enforcement on the kill-switch, fraud-alert or audit-log routes. | Apply explicit authentic`
- `8: | **P0** | Kill-switch trusts caller-supplied admin identity and does not activate infrastructure flag | UI hard-codes `admin-master-001`; Controller writes it as `last_modified_by_admin_id` and Redis flag write is commented out. The UI can`
- `9: | **P0** | SLA update UI shows success without checking HTTP response | `handleUpdateSLA` awaits the request but never tests `res.ok`/returned normalized config; failed/rejected persistence can be declared globally overridden. | Validate se`
- `10: | **P1** | Failed configuration load leaves dangerous client defaults eligible for overwrite | Fetch errors are console-only; default 15/45/24 values remain editable/savable even if current global settings are unavailable. | Render unavaila`
- `11: | **P1** | Emergency control relies on two local checkboxes only | No step-up authentication, incident/case ID, second approver, maintenance window, impact checklist, reason, notification plan or confirmation of completion is captured. | Im`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: | **P0** | SLA update UI shows success without checking HTTP response | `handleUpdateSLA` awaits the request but never tests `res.ok`/returned normalized config; failed/rejected persistence can be declared globally overridden. | Validate se`
- `10: | **P1** | Failed configuration load leaves dangerous client defaults eligible for overwrite | Fetch errors are console-only; default 15/45/24 values remain editable/savable even if current global settings are unavailable. | Render unavaila`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
