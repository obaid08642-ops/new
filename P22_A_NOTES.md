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
