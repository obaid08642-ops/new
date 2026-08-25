# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_FINANCIAL_LEDGER_WAREHOUSE_GAPS_20260819.md`
- **Member SHA-256:** `c3afa5f8cc6a8acac8cfaaede090879f09c162b4860701fd0c5f6fd040cd023c`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P1** | Financial source outages are partially masked | Summary/withdrawal failures set unavailable, but commission and warehouse fetch failures silently leave empty cards/lists; no per-source error/retry/timestamp scope exists. | Report`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — financial ledger and warehouse quotation gaps`
- `9: | **P1** | Full provider bank details are displayed in a general financial dashboard | Withdrawal cards show bank name and full IBAN with no masking, finance role gate, reveal audit or step-up. | Apply minimum-necessary finance roles, mask/`
### state_transitions
- `3: ## Confirmed defects`
- `8: | **P0** | Payout execution always reports Moyasar completion without checking response | It awaits the request, then alerts payment was sent/completed and mutates row locally regardless of `res.ok`, maker-checker routing, payment gateway s`
- `10: | **P1** | Warehouse quotation is priced locally and declared sent without checking/validating server outcome | Item prices are edited only in local state; API response is unused and UI changes status/announces quotation sent. No supplier c`
- `11: | **P1** | Financial source outages are partially masked | Summary/withdrawal failures set unavailable, but commission and warehouse fetch failures silently leave empty cards/lists; no per-source error/retry/timestamp scope exists. | Report`
### payment_insurance_relevance
- `7: | **P0** | Ledger recomputes provider earnings through hard-coded client commission/VAT rules | UI applies 15%/10%/5% by provider type and calculates provider earning as `(base - commission) + VAT`; neither rates nor VAT treatment are retur`
- `8: | **P0** | Payout execution always reports Moyasar completion without checking response | It awaits the request, then alerts payment was sent/completed and mutates row locally regardless of `res.ok`, maker-checker routing, payment gateway s`
- `9: | **P1** | Full provider bank details are displayed in a general financial dashboard | Withdrawal cards show bank name and full IBAN with no masking, finance role gate, reveal audit or step-up. | Apply minimum-necessary finance roles, mask/`
- `10: | **P1** | Warehouse quotation is priced locally and declared sent without checking/validating server outcome | Item prices are edited only in local state; API response is unused and UI changes status/announces quotation sent. No supplier c`
- `11: | **P1** | Financial source outages are partially masked | Summary/withdrawal failures set unavailable, but commission and warehouse fetch failures silently leave empty cards/lists; no per-source error/retry/timestamp scope exists. | Report`
- `12: | **P1** | Financial UI uses raw English/Arabic copy and lacks six-language/accessibility coverage | Ledger labels, tax formula, payout and warehouse actions are not localized or reviewed for currency/legal terminology. | Deliver reviewed A`
- `16: Financial ledger and B2B warehouse operations are **P0 FIX/BLOCKED**. They must not determine provider payout or procurement quote truth until server-authoritative calculations, verified execution and governed financial workflow controls ar`
### error_empty_loading_retry_cancel
- `11: | **P1** | Financial source outages are partially masked | Summary/withdrawal failures set unavailable, but commission and warehouse fetch failures silently leave empty cards/lists; no per-source error/retry/timestamp scope exists. | Report`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
