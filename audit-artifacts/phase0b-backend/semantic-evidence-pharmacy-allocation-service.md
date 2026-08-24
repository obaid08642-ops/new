# Phase 0B semantic evidence — PharmacyAllocationService

**Archive member:** `src/modules/pharmacy/services/pharmacy-allocation.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–263 and 264–317 from the baseline archive extraction; the second range closed the truncation boundary.

Lines 2–27 define allocation/order/inventory repositories, SmartSplit, notifications, event bus, workflow engine, and provider-role assertion. Lines 29–42 implement provider-scoped allocation list and order lookup using `pharmacy_account_id` and return 404 when no provider-owned allocation exists.

Lines 44–50 implement allocation detail. Missing allocation returns 404; provider-role callers are checked against pharmacy account ID; patient account ID is excluded from the joined order projection.

Lines 52–131 implement item-level action. Provider role and allocation ownership are required; only pending-review/partially-confirmed allocations are mutable. Available/substitute/unavailable actions reserve or release stock with inventory predicates, set substitution metadata/prices, recalculate allocation subtotal/total, save timeline, and notify the patient when unavailable. No visible idempotency key or transaction spans inventory and allocation save.

Lines 133–161 implement allocation confirmation. Allowed transitions are enforced; all unavailable → rejected, mixed availability → partially confirmed, otherwise confirmed; estimated ready time is computed; order aggregation, patient notification, and allocation save follow.

Lines 163–211 implement preparing, ready, out-for-delivery, and delivered. Advance enforces provider ownership, transitions state, refreshes parent order, notifies patient, and emits event. Delivery metadata is persisted after out-for-delivery. Delivery credits provider earnings into platform ledger if no duplicate provider-earning entry exists; gross/commission/VAT/settlement delay are read from finance config with defaults, ledger state starts pending, and ledger failure does not block delivery.

Lines 213–241 implement generic advance and provider cancellation. Advance enforces provider role/ownership and transition table, refreshes parent order, notifies patient, and emits event. Cancellation rejects terminal delivered/cancelled states, releases stock, transitions and saves allocation, refreshes parent, notifies patient, and emits event. No visible replay/idempotency claim exists.

Lines 243–271 refresh parent order status from allocation states. Delivered/cancelled/rejected combinations can advance parent to delivered; out-for-delivery and preparing are aggregated; fully allocated can become confirmed. Parent workflow errors are swallowed with `.catch(() => null)` after the attempted transition.

Lines 273–286 expire stale pending-review allocations, release stock, transition to expired, save, refresh parent, and return scanned/expired counts. Lines 288–316 implement provider-owned insurance update, require order insurance details, persist status/copay/covered/rejection metadata and approver identity/date, emit event, and return details.

**Auth/ownership:** provider role assertion and pharmacy account ownership for allocation operations; detail has conditional provider check; order parent aggregation is system-driven; insurance update is provider-owned.

**State transitions:** pending review → confirmed/partially confirmed/rejected/expired; confirmed → preparing → ready for pickup → out for delivery → delivered; cancellation; parent order aggregation.

**Price/payment/insurance source:** allocation item unit price comes from inventory/substitute records; totals recalculate from offered quantities; provider earnings use finance_config commission/VAT/settlement defaults; insurance metadata is body-supplied and persisted.

**Security/truthfulness observations:** inventory reservation/release and allocation save are not visibly transactional; repeated item actions/cancel/delivery may duplicate side effects; provider earnings duplicate check is non-atomic; refresh parent errors are swallowed; `expireStale` has no visible authorization boundary; insurance body accepts copay/covered amounts; notifications/events swallow failures.

**Test implications:** provider owner/stranger/unauth, item action replay/race, stock conservation, transition table, delivery/earnings duplicate, cancellation replay, parent aggregation, stale expiry authorization, insurance ownership/amount validation, and event failure behavior. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
