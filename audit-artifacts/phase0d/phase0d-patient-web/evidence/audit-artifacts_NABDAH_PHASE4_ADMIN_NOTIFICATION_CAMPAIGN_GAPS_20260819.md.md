# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_NOTIFICATION_CAMPAIGN_GAPS_20260819.md`
- **Member SHA-256:** `577807d42a5f21a3881e1f883eee64f6940d9a2c5d2f3a3714a7f52f85280b02`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Mass broadcast can target all patients/providers with only one form submit | Composer permits `all` or broad role segment plus direct send, with no recipient preview/count confirmation, consent/preference exclusion, content appro`
- `8: | **P0** | Manual retargeting reports success even when API fails | `runRetarget` catches any error to `null` then unconditionally alerts that retargeting ran. | Show failure/retry and returned execution reference/state; restrict retargetin`
- `9: | **P1** | Deep links are arbitrary free text | Admin may enter any route string; UI does not validate an allowlist, recipient-compatible destination, signed context or test preview. | Use typed/allowlisted deep-link destinations with safe `
- `11: | **P1** | Data-source failures become zero/unknown performance and empty campaign queues | Stats/segments/campaign failures are individually caught to `null`/empty data without an error state. | Show per-source unavailable/stale/retry stat`
- `12: | **P1** | Campaign UI is Arabic-only and lacks accessibility/notification-privacy warnings | Content, segment, delivery, cancellation and recipient data lack reviewed six-language/RTL-LTR accessibility and privacy context. | Deliver review`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — notification and campaign governance gaps`
- `7: | **P0** | Mass broadcast can target all patients/providers with only one form submit | Composer permits `all` or broad role segment plus direct send, with no recipient preview/count confirmation, consent/preference exclusion, content appro`
- `9: | **P1** | Deep links are arbitrary free text | Admin may enter any route string; UI does not validate an allowlist, recipient-compatible destination, signed context or test preview. | Use typed/allowlisted deep-link destinations with safe `
- `16: Admin notification/campaign control is **P0 FIX/BLOCKED**. It must not dispatch or retarget users until audience consent, content approval, safe routing, scheduling validation, truthful execution state and audit controls are implemented.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Mass broadcast can target all patients/providers with only one form submit | Composer permits `all` or broad role segment plus direct send, with no recipient preview/count confirmation, consent/preference exclusion, content appro`
- `8: | **P0** | Manual retargeting reports success even when API fails | `runRetarget` catches any error to `null` then unconditionally alerts that retargeting ran. | Show failure/retry and returned execution reference/state; restrict retargetin`
- `10: | **P1** | Campaign scheduling has no explicit timezone/past-date/recipient-state validation | Local `datetime-local` is transformed by browser timezone; no UI policy or returned normalized schedule/effective audience is displayed. | Requir`
- `11: | **P1** | Data-source failures become zero/unknown performance and empty campaign queues | Stats/segments/campaign failures are individually caught to `null`/empty data without an error state. | Show per-source unavailable/stale/retry stat`
- `12: | **P1** | Campaign UI is Arabic-only and lacks accessibility/notification-privacy warnings | Content, segment, delivery, cancellation and recipient data lack reviewed six-language/RTL-LTR accessibility and privacy context. | Deliver review`
- `16: Admin notification/campaign control is **P0 FIX/BLOCKED**. It must not dispatch or retarget users until audience consent, content approval, safe routing, scheduling validation, truthful execution state and audit controls are implemented.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: | **P0** | Manual retargeting reports success even when API fails | `runRetarget` catches any error to `null` then unconditionally alerts that retargeting ran. | Show failure/retry and returned execution reference/state; restrict retargetin`
- `11: | **P1** | Data-source failures become zero/unknown performance and empty campaign queues | Stats/segments/campaign failures are individually caught to `null`/empty data without an error state. | Show per-source unavailable/stale/retry stat`
- `12: | **P1** | Campaign UI is Arabic-only and lacks accessibility/notification-privacy warnings | Content, segment, delivery, cancellation and recipient data lack reviewed six-language/RTL-LTR accessibility and privacy context. | Deliver review`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
