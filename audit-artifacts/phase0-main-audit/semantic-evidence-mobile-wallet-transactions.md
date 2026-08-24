# Semantic evidence — Mobile Wallet Transactions

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/wallet/transactions.tsx:38–58` calls `/wallet/transactions` without page/limit/cursor parameters and maps `res.data` directly under `@ts-nocheck`. If the response has no `data`, the list remains empty; errors are only sent to `console.error` and loading ends, with no visible retry, unauthorized, offline, stale or server-error state. There is no pagination/infinite scroll, pull-to-refresh, deduplication, last-updated indicator, or transaction-detail route.

The mapping assumes `_id/id`, amount, type, description and createdAt, negates any `debit` amount locally, and derives Arabic category/icon values from type (`:43–52`). No schema validation, currency/scale assertion, balance/ledger reconciliation, pending/failed/reversed/refunded state, timezone policy, or server-provided display semantics is visible. Missing dates become an empty string and unknown types fall through to debit-like labels/icons, potentially misrepresenting financial events.

Filters are hard-coded Arabic labels and filter only the already-fetched local array (`:21,60–69,88–107`), so they are not server-backed and cannot cover paginated history. The rendered rows expose descriptions, amounts, dates and truncated IDs without privacy masking or detail/receipt/action flow (`:112–166`). There is no empty-state component after filtering, no loading skeleton, accessibility labels, or error recovery. No Phase 0 remediation was made.
