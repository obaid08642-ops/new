# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/README.md`
- **Member SHA-256:** `563e7b80717407689ea7ccc7c729aa1710025b46dc5b1991be002b32144e14c3`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | **Design System** | RTL-first, Admin-overridable Theme, Luxury Concept C |`
- `45: 1. **No Hardcoded Values:** All text comes from i18n/CMS. Dimensions from Design System tokens. Keys from `.env` via `ConfigManager`.`
- `46: 2. **Admin-Ready:** Everything is designed to be configurable remotely (colors, fonts, banners, tours).`
### state_transitions
- `13: | **Phase 0 Status** | Approved (Single Source of Truth) |`
- `28: * [PHASE_1C.md](./PHASE_1C.md) — Auth, State, & Data Layer`
- `32: ## Document Status`
- `34: | Document | Status | Last Updated |`
- `36: | PROJECT_CONSTITUTION.md | **Approved** | 2026-07-13 |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `48: 4. **Offline Graceful Degradation:** Use `Repository` pattern. Cache locally, sync remotely.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
