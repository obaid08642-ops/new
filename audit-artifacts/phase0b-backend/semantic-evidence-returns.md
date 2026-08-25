# Phase 0B semantic evidence — Returns

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/returns/returns.service.ts:2–187`
- `src/modules/returns/returns.controller.ts:2–46`
- `src/modules/returns/returns.module.ts:2–18`

`ReturnsController` is JWT guarded and exposes patient create/list/detail/eligibility, provider list, and admin decision (`returns.controller.ts:6–45`). Patient create and eligibility pass `user.id` into service ownership checks; provider list passes `user.id` as provider identity; detail permits patient owner or exact role `'admin'`; decision is decorated for `ADMIN` (`11–44`).

`ReturnsService` loads `return_policy` from `finance_config`, defaults to a seven-day window and category-based non-returnable rules (`returns.service.ts:31–36`). Eligibility validates order ownership and delivered state/window, then returns item IDs, names, quantities, prices, and returnability (`44–71`). Create recomputes pharmacy return amounts from order items and blocks opened/used/non-returnable items; non-pharmacy amounts are resolved from the order total, not client amount (`73–103`). It persists reason/details/items/refund method/amount/attached docs with status `processing` and returns the full request (`105–120`).

Patient list is unbounded and returns full requests (`123–125`). Provider list first loads all order IDs for a pharmacy then queries returns by those IDs (`127–134`) without visible pagination/projection. Detail authorizes patients or exact admin and returns the full request (`136–143`). Admin list is unbounded (`145–147`). Admin decision loads a processing request, writes raw note/resolver metadata, rejects by save or approves by setting approved, calls `RefundExecutor.execute`, sets execution, then marks completed and saves (`156–185`). There is no visible idempotency, transaction/outbox, compensation/retry or state predicate around the refund saga; a crash after financial execution but before request save can leave workflow state inconsistent. Module registers ReturnRequest, imports WalletModule, provides repository/service and exports service (`returns.module.ts:9–17`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: refund non-atomicity, replay/concurrency risk, broad request/eligibility PII, provider query scaling, raw notes/docs, policy trust/config governance, and exact-role authorization drift.
