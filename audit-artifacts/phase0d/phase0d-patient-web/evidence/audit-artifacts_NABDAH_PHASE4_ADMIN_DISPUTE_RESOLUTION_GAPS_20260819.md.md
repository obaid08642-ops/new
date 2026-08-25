# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_DISPUTE_RESOLUTION_GAPS_20260819.md`
- **Member SHA-256:** `e3e5d382e3436b4b99cc07b765d5d236a49beafb56ceb6e0261eb34e5616b166`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
- `8: | **P0** | UI declares financial resolution without checking Backend response or payment evidence | It ignores HTTP status/body and always alerts refund approved/closed or complaint rejected, with no refund ID, amount, gateway state, bookin`
- `10: | **P1** | Browser token reuse and data outage are handled unsafely | Page reads `admin_token` from `localStorage`; failed/non-OK list load renders no disputes and makes a false “transactions normal” statement. | Use unified secure session `
- `16: Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.`
### backend_consumers_or_contracts
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
### auth_ownership
- `1: # Phase 4 Admin Dashboard — dispute-resolution gaps`
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
- `9: | **P1** | Dispute decisions lack case evidence, reason codes, partial decision, appeals and maker-checker controls | One click provides a fixed reason, no evidence/communications/timeline/amount review, no policy/role/step-up, and no appea`
- `10: | **P1** | Browser token reuse and data outage are handled unsafely | Page reads `admin_token` from `localStorage`; failed/non-OK list load renders no disputes and makes a false “transactions normal” statement. | Use unified secure session `
- `16: Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
- `8: | **P0** | UI declares financial resolution without checking Backend response or payment evidence | It ignores HTTP status/body and always alerts refund approved/closed or complaint rejected, with no refund ID, amount, gateway state, bookin`
- `10: | **P1** | Browser token reuse and data outage are handled unsafely | Page reads `admin_token` from `localStorage`; failed/non-OK list load renders no disputes and makes a false “transactions normal” statement. | Use unified secure session `
- `11: | **P1** | Missing dispute fields are fabricated | UI substitutes patient, provider, SAR 150 and generic quality objection values, which can distort high-impact decisions. | Render verified source values or explicit unavailable/malformed st`
- `12: | **P1** | Dispute UI is Arabic-only and omits accessible high-risk warnings | Financial/legal actions, status and case data lack six-language/accessibility and confidentiality treatment. | Provide reviewed multilingual accessible decision `
- `16: Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.`
### payment_insurance_relevance
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
- `8: | **P0** | UI declares financial resolution without checking Backend response or payment evidence | It ignores HTTP status/body and always alerts refund approved/closed or complaint rejected, with no refund ID, amount, gateway state, bookin`
- `16: Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.`
### error_empty_loading_retry_cancel
- `7: | **P0** | “Refund” and “reject dispute” invoke the same forced-cancel endpoint | Both actions POST `/admin/authority/orders/:id/force-cancel`; only a text reason differs. Rejecting a complaint can therefore initiate the same cancellation p`
- `8: | **P0** | UI declares financial resolution without checking Backend response or payment evidence | It ignores HTTP status/body and always alerts refund approved/closed or complaint rejected, with no refund ID, amount, gateway state, bookin`
- `10: | **P1** | Browser token reuse and data outage are handled unsafely | Page reads `admin_token` from `localStorage`; failed/non-OK list load renders no disputes and makes a false “transactions normal” statement. | Use unified secure session `
- `16: Admin dispute resolution is **P0 FIX/BLOCKED**. It must not resolve, cancel or refund an order until decision and money-movement semantics are separated, verified and audited.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
