# Phase 4 Admin Dashboard — financial ledger and warehouse quotation gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Ledger recomputes provider earnings through hard-coded client commission/VAT rules | UI applies 15%/10%/5% by provider type and calculates provider earning as `(base - commission) + VAT`; neither rates nor VAT treatment are returned as per-ledger authoritative values. | Render immutable server-calculated ledger entries, commission rule/version/tax basis and reconciled totals only; prohibit client calculation for payout/financial decisions. |
| **P0** | Payout execution always reports Moyasar completion without checking response | It awaits the request, then alerts payment was sent/completed and mutates row locally regardless of `res.ok`, maker-checker routing, payment gateway state or execution evidence. | Reuse typed payout state/reference handling, response verification, reconciliation and idempotency; never claim gateway completion without verified transfer record. |
| **P1** | Full provider bank details are displayed in a general financial dashboard | Withdrawal cards show bank name and full IBAN with no masking, finance role gate, reveal audit or step-up. | Apply minimum-necessary finance roles, mask/reveal controls and audited access; reuse verified payout destination data only. |
| **P1** | Warehouse quotation is priced locally and declared sent without checking/validating server outcome | Item prices are edited only in local state; API response is unused and UI changes status/announces quotation sent. No supplier cost, inventory, currency, approval, expiry or pharmacy consent evidence is required. | Use server quote drafts with validated items/cost policy/currency/tax/expiry, approval tiers, response status/reference, immutable quote version and pharmacy acceptance state. |
| **P1** | Financial source outages are partially masked | Summary/withdrawal failures set unavailable, but commission and warehouse fetch failures silently leave empty cards/lists; no per-source error/retry/timestamp scope exists. | Report per-source status/staleness/retry and prevent interpretation of incomplete financial data as zero/no work. |
| **P1** | Financial UI uses raw English/Arabic copy and lacks six-language/accessibility coverage | Ledger labels, tax formula, payout and warehouse actions are not localized or reviewed for currency/legal terminology. | Deliver reviewed AR/EN/UR/HI/BN/FIL accessible finance UI with locale-safe terms/numbers/currency. |

## Decision

Financial ledger and B2B warehouse operations are **P0 FIX/BLOCKED**. They must not determine provider payout or procurement quote truth until server-authoritative calculations, verified execution and governed financial workflow controls are in place.
