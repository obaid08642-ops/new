# Phase 0B semantic evidence — pharmacy_ops.service.ts

**Archive member:** `src/modules/pharmacy_ops/pharmacy_ops.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–232; full 232-line member covered.

## Wiring and queue reads (lines 2–72)

Lines 2–14 import Order/OrdersService, enums, inventory/medicine schemas, events/workflow helpers and repository wrappers. Lines 16–29 define PharmacyOpsService with OrderRepository, PharmacyInventoryRepository, MedicineRepository, OrdersService and EventEmitter2. Lines 31–32 map universal ServiceState to pharmacy domain states.

Lines 35–72 expose incoming, preparing, ready, completed, refillOrders, basketReview and awaitingApproval queue reads. Each query scopes by `pharmacy.id` and limits 50; projections exclude `_id`/`__v`, and state buckets are explicit except basket predicates. The service assumes caller identity/role has already been validated; no role/tenant check is present inside these methods, no pagination cursor is exposed, and `pharmacy` is `any`.

## Inventory (lines 74–105)

Lines 75–82 load pharmacy inventory and medicine records, returning empty when no inventory; missing medicine references produce entries with undefined medicine rather than an explicit unavailable/error state. Lines 83–89 update stock with `findOneAndUpdate` upsert by pharmacy/medicine, accepting any stock_qty and setting availability/restock time; no finite/integer/nonnegative bound, optimistic version, idempotency or audit actor is visible.

Lines 91–105 add medicine to inventory. If medicine_id is absent, it creates a new unverified medicine using client-supplied name, ingredient, price, category and prescription flag (95–100), marks it pending review via a nonawaited event (102), then updates stock. No duplicate medicine resolution, price/currency validation, role/tenant/authorization check, catalog moderation gate, or transaction couples medicine creation with inventory update.

## Order and item operations (lines 107–172)

Lines 108–116 orderDetail/loadOrderForEdit use `{id, pharmacy_id}` and return NotFound, giving positive pharmacy ownership scoping. Lines 118–135 mark/restore an item unavailable via in-memory mutation/save and emit event. No allowed order state, item index integer/range schema, version/CAS, idempotency or event delivery guarantee is visible.

Lines 136–147 update quantity after finite >=1 check, recomputes subtotal/total from existing item prices plus delivery fee, saves and emits. Quantity is not required to be integer or bounded, and read-modify-save is raceable. Lines 149–171 substitute an item using client-supplied name, medicine_id, qty, price and note. It validates only nonempty name; it can accept arbitrary price/medicine identity, uses `body.qty || orig.qty` (so zero/invalid values silently fall back), recomputes totals from client-provided price, and has no catalog/availability/prescription/owner-role/state/consent/idempotency check beyond pharmacy-scoped order lookup.

## Basket workflow (lines 174–219)

Lines 174–191 submitBasket loads pharmacy-scoped order, makes repeat submission a no-op if already submitted, snapshots pre-review items/total, recomputes subtotal/total, changes basket_review_status to submitted_for_patient_approval, saves and emits. The no-op is based on current state but lacks conditional atomic transition/version and idempotency key; event failure is not handled.

Lines 194–203 patientApproveBasket scopes by patient_id, requires submitted state, changes to patient_approved, saves and emits. Lines 206–219 patientRejectBasket scopes by patient_id, requires submitted state, changes basket to rejected, sets order state cancelled and reason, saves and emits. Neither mutation visibly uses idempotency, CAS, cancellation/refund/stock compensation, or a strict state transaction; concurrent approve/reject can race.

## Insurance state (lines 221–232)

Lines 221–231 setInsuranceStatus scopes pharmacy_id, accepts only literal approved/rejected/pending at the type level, writes status/time/reason, saves and emits. There is no preauthorization evidence, policy/order linkage, transition matrix, amount/currency update, actor audit, idempotency, version check or rejection reason bound.

## Audit judgment and findings

1. **P1 — client-controlled substitution/price/catalog:** substituteItem accepts client medicine identity, name, quantity and price and recomputes order totals from them (149–171).
2. **P1 — non-atomic inventory/order/basket mutations:** stock update, item edits, basket submit/approve/reject and insurance updates use read-modify-save or independent writes with no visible CAS/idempotency/transaction (83–89,118–147,174–232).
3. **P1 — missing role/tenant and state enforcement at service boundary:** methods accept `any pharmacy/patient` and rely on external guards; no state eligibility beyond basket/approval checks is present (36–232).
4. **P2 — event failures/undefined catalog entries are not explicit:** nonawaited events and missing medicine joins can yield silent operational/availability ambiguity (75–82,102,124,133,146,170,190,202,217,229).

No product code was changed and no tests were executed during this semantic read.
