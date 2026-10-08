# P22 COMMERCE slice — agent A notes (`p22-a`, base `e0bec75c`)

## Inventory summary (exists vs built)

### 22.1 Repeat and refill
- EXISTS: `POST orders/:id/reorder` + `:id/reorder-partial` (`orders.controller.ts:28-38`), governed `pharmacy_orders`
  draft-from-previous (`orders.service.ts:631-669`), chronic-refill fulfilment hook on DELIVERED
  (`orders.service.ts:288-296`, writes `medicationreminders`), idempotency metadata contract
  (`orders.idempotency.contract.spec.ts`), `NotificationService.create` (read-only, `notifications.service.ts:47`).
- EXISTS (provider-side only): low-stock plumbing `PharmacyInventoryExtService`
  (`pharmacy/services/pharmacy-inventory-ext.service.ts`: `restock`/`listLowStockAlerts`/`acknowledgeAlert`).
  No patient-facing alert subscriptions, no price-drop alerts.
- MISSING → BUILT (this worktree): Rx-validity helpers, reorder eligibility flags, refill subscriptions
  + reminders + auto-created refill drafts. See per-task sections below.

### 22.2 Back-in-stock / price-drop alerts + shareable wishlists
- EXISTS: provider low-stock alerts (above); wishlist = `patient_profiles.wishlist` snapshots
  (`users.service.ts:30-86`, users/ is READ-ONLY for this agent); `wishlist_adds_count` in product-ranking.
- MISSING → BUILT: patient `product_alerts` subscriptions + restock/price-drop triggers
  (notify via existing notification service, read-only), shareable wishlists in NEW `wishlist/` module
  (share token resolves to item snapshots only).

### 22.3 Frequently-bought-together + alternatives
- EXISTS: `medicines.alternatives: string[]`, `related_product_ids`, `interactions: string[]`,
  `active_ingredient`, `requires_prescription` (`medicine.schema.ts`); NOTHING co-purchase/bundle.
- MISSING → BUILT fully: pure pharmacist-safe rule functions + bundles service.

### 22.5 Order changes
- EXISTS: `POST orders/:id/cancel` with stage-based `CancellationPolicy` + real refunds via
  `RefundExecutor` (`orders.service.ts:438-512`, finance-engine READ-ONLY),
  `DispatchService.dispatch`/`dispatchSplit` (`orders/dispatch.service.ts:76-176`),
  `SmartSplitService` greedy set-cover (`pharmacy/services/smart-split.service.ts`),
  `markPartial` partial-refund path (`orders.service.ts:404-429`).
- MISSING → BUILT: configurable time-based cancellation window, edit-before-accept,
  explicit partial-refund endpoint, split orchestration with atomic stock guard + concurrency test.

### 22.15-backend Coupon rules + referral/affiliate links
- EXISTS: `CouponService` validate/apply/release (finance-engine READ-ONLY, `finance-engine.module.ts:242-340`:
  active/expiry/max-uses/per-user/min-order/caps/provider/category/first-order + atomic `$inc` guard),
  `FraudService.recordCouponFailure` abuse hook (`:488`), `admin-coupons.controller` (admin/ READ-ONLY),
  `ReferralService` code issuance/apply/conversion (`referral/referral.service.ts`).
- MISSING → BUILT: stacking-limit evaluation engine (NEW `coupons/` module, delegates single-code leg to
  existing `CouponService.validate` read-only), affiliate link issuance/attribution/redemption +
  one-device/one-phone anti-fraud in `referral/` (see ownership note below).

## Ownership note
Plan grants `referrals/` (plural, does not exist on disk). The on-disk feature dir is
`backend/src/modules/referral/` (singular). Treated as owned (no other commerce agent claims it);
only additive changes there.

## New providers needing `app.module.ts` registration (orchestrator job)
- `WishlistModule` (`backend/src/modules/wishlist/wishlist.module.ts`) — NEW module, not referenced anywhere.
- `CouponsModule` (`backend/src/modules/coupons/coupons.module.ts`) — NEW module, not referenced anywhere.
- Everything else is registered inside already-imported modules I own:
  `ReorderEligibilityService` (OrdersModule), `RefillSubscriptionService` + `RefillController` +
  `ProductAlertService` + `ProductAlertController` (PharmacyModule),
  `OrderAmendmentService` (OrdersModule), `BundlesService` + `BundlesController` (PharmacyModule),
  `AffiliateService` (ReferralModule).

## DEFERRED-NEED (changes outside owned modules — NOT made, orchestrator to wire)
- NONE yet.

## Endpoint contracts provided (for app/web agents)
- `GET /orders/:id/reorder-eligibility` → `{ order_id, eligible, items: [{key,medicine_id,name,qty,
  requires_prescription,rx_status,rx_valid_until,in_stock,note}], blocked_count }`.
- `POST /pharmacy/refills/subscriptions` (idempotent) body `{ items:[{medicine_id,qty}],
  cadence_days, prescription_id?, prescription_valid_until?, reminder_days_before?, delivery_address? }`.
- `GET /pharmacy/refills/subscriptions` · `POST /pharmacy/refills/subscriptions/:id/cancel` (idempotent)
  · `POST /pharmacy/refills/process-due` (admin/cron, idempotent).
- `POST /pharmacy/alerts/subscriptions` (idempotent) `{ medicine_id, kind: restock|price_drop,
  price_threshold? }` · `DELETE /pharmacy/alerts/subscriptions/:id` · `GET /pharmacy/alerts/subscriptions`.
- `POST /wishlist/share` `{ item_ids }` → `{ token, url_path }` · `GET /wishlist/shared/:token`
  (public, snapshot only) · `DELETE /wishlist/shares/:id` · `GET /wishlist/shares`.
- `GET /pharmacy/bundles/frequently-bought-together?medicine_id=` ·
  `GET /pharmacy/medicines/:id/alternatives` (both attach `interaction_warnings`).
- `POST /orders/:id/cancel` now enforces time window (unchanged contract, new `cancel_window_minutes`).
  `PATCH /orders/:id/items` (edit before accept) · `POST /orders/:id/refund-partial` (idempotent)
  · `POST /orders/:id/split` (idempotent).
- `POST /coupons/evaluate-stack` `{ codes:[], order_total, categories? }` (no write).
- `POST /referrals/affiliates/issue` · `POST /referrals/affiliates/:code/click` (public-ish, attributed)
  · `POST /referrals/affiliates/:code/redeem` (idempotent, device/phone anti-fraud).

## Live-journey steps needed from journey agent (docker-gated here)
- 22.1: patient with chronic Rx subscribes (reminder_days_before=2) → advance clock past
  `next_refill_at - 2d` → reminder notification exists → advance past `next_refill_at` →
  `pharmacy_orders` draft with `refill_subscription_id` + idempotency key exists → expired-Rx
  subscription → process-due marks `expired`, no draft.
- 22.2: subscribe restock alert on OOS product → provider restock → notification to subscriber only;
  wishlist share link opens without login and shows items only.
- 22.5: cancel after window → 400; edit after ACCEPTED → 400; split with 1 unit left across 2
  concurrent splits → exactly one allocation wins.

## Per-task log
(see below; appended per commit with real command tails + mutation proofs)

### P22.1 Repeat and refill — BUILT-NEW on existing reorder (commit below)
Files:
- `backend/src/modules/orders/prescription-validity.ts` (new, pure)
- `backend/src/modules/orders/reorder-eligibility.service.ts` (new) + `.spec.ts` (14 tests)
- `backend/src/modules/pharmacy/services/refill-subscription.service.ts` (new) + `.spec.ts` (9 tests)
- `backend/src/modules/pharmacy/dto/refill-subscription.dto.ts` (new)
- `backend/src/modules/pharmacy/controllers/refill.controller.ts` (new)
- Edited (owned): `orders.service.ts` (attach `reorder_eligibility` to governed reorder drafts,
  response-only), `orders.controller.ts` (GET `:id/reorder-eligibility`), `orders.module.ts`,
  `pharmacy.module.ts`, `pharmacy-notification.service.ts` (5 new notify methods, same `.catch(()=>null)` style).
- Rx validity: explicit override → verified_at → createdAt + 90d default (`DEFAULT_RX_VALIDITY_DAYS`).
  Per-drug MOH validity config is NOT built (no admin-config surface in scope).
- Proofs: new specs 23/23 green; existing orders specs 21/21 green (service, governed-reorder-tracking,
  idempotency contract); `tsc --noEmit` clean; mutation probe (expiry gate `&& false`) → expired-test RED,
  restored → green. No `any` in new files (grep: only comment words "many"/"any item").

### P22.2 Alerts + shareable wishlists — BUILT-NEW (commit below)
Files:
- `backend/src/modules/pharmacy/services/product-alert.service.ts` (new) + `.spec.ts` (8 tests)
- `backend/src/modules/pharmacy/dto/product-alert.dto.ts` (new)
- `backend/src/modules/pharmacy/controllers/product-alert.controller.ts` (new)
- `backend/src/modules/wishlist/` (new module: service + 2 controllers + dto + spec, 5 tests)
- Edited (owned): `pharmacy.module.ts` (providers/controllers),
  `pharmacy-inventory-ext.service.ts` (0→positive restock edge → `onRestock`; optional dep, restock
  never blocked by alert fan-out), `pharmacy-notification.service.ts` (restock/price-drop notifiers).
- Wiring notes: provider restock path fires automatically; price pipeline calls
  `POST /pharmacy/alerts/report-price` (no catalog hook — medicines→pharmacy import would risk a
  module cycle; documented as pipeline contract instead).
- Proofs: new specs 13/13 green; existing pharmacy specs 7/7 green; `tsc` clean; mutation probe
  (key-match gate disabled) → ownership test RED (notified 2, wrong user), restored → green.

### P22.3 Bundles + alternatives — BUILT-NEW (nothing existed; commit below)
Files:
- `backend/src/modules/pharmacy/bundles/bundle-rules.ts` (new, pure: co-purchase pairs, no-Rx
  cross-sell, symmetric interaction warnings, same-ingredient alternatives)
- `backend/src/modules/pharmacy/bundles/bundles.service.ts` (new, read-only over orders /
  pharmacy_orders / prescriptions / medicines) + `.spec.ts` (12 tests: 7 pure + 5 service)
- `backend/src/modules/pharmacy/bundles/bundles.controller.ts` (new: BundlesController +
  MedicineAlternativesController)
- Edited (owned): `pharmacy.module.ts` only.
- Proofs: 12/12 green; `tsc` clean; zero `any` in new files; mutation probe (Rx gate disabled)
  → 2 service tests RED (Rx item suggested), restored → green.

### P22.5 Order changes — BUILT on existing cancel/refund/split (commit below)
Files:
- `backend/src/modules/orders/order-amendment.service.ts` (new) + `.spec.ts` (15 tests)
- `backend/src/modules/orders/dispatch.service.ts`: added `tryDeductStock` (atomic `$gte` guard).
- `backend/src/modules/orders/orders.service.ts`: patient cancellation window in `cancel()`
  (finance_config `cancel_policy.cancel_window_minutes`, default 30; admin/provider ungated) +
  exported `isGovernedPharmacyFlow` (amendment guard; shared `isCanonicalPharmacyOrder` untouched —
  containment specs still green).
- `backend/src/modules/orders/orders.dto.ts`: EditItemsDto / RefundPartialDto / SplitOrderDto.
- `backend/src/modules/orders/orders.controller.ts`: PATCH `:id/items`, POST `:id/refund-partial`,
  POST `:id/split` (all idempotent); `orders.module.ts` registers/exports OrderAmendmentService.
- Semantics: edit pre-accept + unpaid only (coupon/loyalty released idempotently, totals recomputed
  from catalog); partial refund capped at total, post-delivery → returns flow, via existing
  RefundExecutor; split requires assigned primary, allocates shortfall atomically, lost race → 409
  with restore. Real semantic find: bare `pharmacy_id` marks legacy-dispatch rows (amendable), not
  governed flow — documented in code.
- Proofs: new 15/15 green; whole orders dir 55/55 green; `tsc` clean; no new `any`; mutation probe
  (`$gte` removed) → concurrency test RED (both racers win), restored → green.

### P22.15-backend Coupons + referral/affiliate — BUILT on existing engines (commit below)
Inventory depth (read-only): CouponService validate/apply/release is genuinely deep (expiry, max-uses
atomic guard, per-user caps, min-order, max-discount, provider/category scope, first-order-only);
FraudService.recordCouponFailure abuse hook exists (threshold 10/h); ReferralService issuance/apply/
conversion exists but had NO device/phone anti-fraud.
Files:
- `backend/src/modules/coupons/` (new module: rules service + controller + dto + spec, 8 tests):
  stacking limits (non-stackable exclusivity, max 3), abuse gate mirroring the FraudService 10/h
  threshold, combined-cap math, applyStack with compensation; single-code leg delegates to existing
  CouponService.validate/apply/release (unmodified).
- `backend/src/modules/referral/affiliate.service.ts` (new) + `.spec.ts` (5 tests): AFF- code issuance
  (collision-checked), click attribution, redemption with one-device/one-phone program-wide guards
  (sha256 hashes only, raw phones never stored), max-uses atomic cap.
- `referral.service.ts` (treated-owned, additive): apply() accepts optional device/phone, enforces the
  same reuse guards, stores device_id/phone_hash; `referral.dto.ts` + `referral.controller.ts`
  (affiliate routes) + `referral-device-fraud.spec.ts` (3 tests).
- New modules needing app.module registration: CouponsModule (imports FinanceEngineModule — no cycle:
  finance-engine imports no feature modules); WishlistModule (P22.2).
- Fraud scoring (velocity/farms/3DS) NOT built here per plan — hard uniqueness only; scoring stays with
  FraudService/fraud agent.
- Proofs: new 16/16 green; `tsc` clean; no new `any` (controller req params typed); mutation probe
  (all-codes-stackable) → 2 stacking tests RED, restored → green.
