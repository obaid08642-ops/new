# Phase 0B semantic evidence — finance-engine.module.ts

**Archive member:** `src/modules/finance-engine/finance-engine.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–1024; full member covered through ranges 1–500, 277–501, 501–1024 and 775–1024 (overlap intentionally preserved).

## Module contract and defaults

Lines 1–19 describe EPIC 1 and declare golden rules: gateway-verified payment or approved operation before money movement, append-only ledger with compensating corrections, and negative provider balances. Lines 20–30 import Nest/Mongoose connection, event, UUID, auth guard/current user/roles and UserRole. Lines 31–50 define allowed ledger types and financial defaults. Line 52 defines `round2` as `Math.round((Number(n) || 0) * 100) / 100`; this converts nonnumeric values to zero and does not reject NaN/Infinity at all call sites.

## LedgerService (lines 55–149)

Lines 57–60 inject a raw Mongoose Connection. Lines 62–98 append an entry after checking ledger type and nonnegative amount; IDs use `Date.now()` plus `Math.random()` (85–86), and the write is a direct `insertOne` (97). The method accepts optional provider/ref/order/financial fields and arbitrary `meta` without a schema-level contract shown here. Lines 101–104 define `exists(type, refType, refId)` as a lookup, described as idempotency for the triple, but append does not atomically reserve/enforce this triple and no unique-index/duplicate-key handling is present in this member.

Lines 106–112 mature escrow with `updateMany` from pending to cleared. Lines 114–143 aggregate balances and intentionally allow negative available balances. The aggregation catches errors and returns an empty result (129), which can turn database failure into a truthful-looking zero balance rather than a fail-closed error. Lines 145–148 read settlement delay from finance_config with a default.

## CommissionResolver (lines 151–234)

Lines 155–193 resolve active, effective-windowed rules in campaign/provider/category/service order, then finance_config, then 10%. The query uses `$or` for effective windows and version/createdAt sorting (180–192). Lines 195–227 validate scope and percent 0–100, find the previous version, deactivate prior rules with updateMany, insert the new rule, and append history. The deactivate-and-insert sequence is not shown as a transaction or unique active-rule CAS; concurrent admins could create competing active versions. There is no explicit date-order check that effective_from <= effective_to. Lines 230–233 expose up to 200 history records with caller-provided filter and no controller-level filter parameters here.

## CouponService (lines 236–334)

Lines 240–287 validate coupon code normalization, active/valid windows, max uses, per-user usage, minimum order, provider/category scope, first-order exclusion, discount percent/amount, max cap and order-total cap. Provider restriction only rejects when both coupon provider_id and context provider_id exist and differ (269–271); a coupon scoped to a provider can therefore be accepted when context provider_id is absent. `first_order_only` checks orders excluding only CANCELLED (276–278), whose state naming must match all non-final/failed/refunded semantics.

Lines 290–319 apply a coupon after validate. For bounded coupons, `$inc` is guarded by used_count < max_uses; for unlimited coupons, usage is incremented without a uniqueness guard (299–307). Usage insertion is rolled back on any insert error (309–317), conflating duplicate-key with arbitrary database failure and making counter rollback itself non-transactional. Lines 322–328 release by order_id, deletes one usage and decrements count without conditional ownership/usage state or atomic coupling. Lines 330–333 create an order_id unique index and a nonunique code/user index; no unique `(code,user_id,order_id)` index is declared here.

## LoyaltyRedeemService (lines 336–426)

Lines 339–368 load config/account and quote a configurable max percent. There is no validation that point_value_sar is positive, max percent is within 0–100, or orderTotal is finite/positive before division/floor. Lines 371–401 floor points, quote, atomically debit the account with a balance guard, then insert a redemption transaction. Debit and transaction insertion are not in a transaction/compensating path; a post-debit insert failure can lose points. There is no unique order redemption key in this member.

Lines 404–425 refund redemption checks for a redeem transaction and existing redeem_refund, credits the account with upsert, then inserts a refund transaction. The check-credit-insert sequence is raceable without a unique conditional insert/transaction; concurrent calls can double-credit. It trusts the caller’s userId for the account lookup and does not compare transaction user_id before recredit.

## FraudService (lines 428–509)

Lines 432–455 raise deduplicated pending fraud alerts by user/type, but the find-then-insert pair is not atomic or uniquely enforced. Lines 458–477 detect refund abuse and failed-payment velocity using fixed thresholds. Lines 480–490 record coupon failures and alert after a threshold; raw coupon code is stored (482), increasing sensitive-data exposure. Lines 492–509 detect multiple paid payments for a booking and raise a critical alert using payment IDs and total. These are detection hooks, not blocking controls, and count queries/alert creation are not transactional.

## RefundExecutor (lines 511–669)

Lines 515–528 inject connection/ledger/fraud/events and read Moyasar secret from environment, failing if absent. Lines 530–548 document gateway refund, wallet/cash credit, ledger/refund, provider debit, booking status and notification. Lines 549–567 validate positive amount and perform a prior ledger lookup plus paid/refunded amount check. The prior lookup is not an atomic idempotency lock; concurrent executions with the same refund_id can both proceed.

Lines 572–591 call Moyasar for non-sandbox payments and update refunded_amount/status. External gateway success followed by database failure can leave an unrecorded refund; retry behavior depends on gateway idempotency not shown here. Lines 592–605 credit wallet with `$inc` then insert a wallet transaction; no unique refund reference or transaction is shown, so concurrent/retried wallet credit can double-credit. Lines 607–615 append refund ledger. Lines 617–637 find provider earning, calculate a proportional debit, check duplicate debit, then append; the check/append sequence is raceable.

Lines 640–653 map booking_kind to collections and update payment status by booking id only. Unknown kind skips booking update while still recording refund. Lines 655–665 insert a delivered notification and emit an event without await/error handling. Lines 667–668 return success. This is a multi-system saga without transaction/outbox/compensation evidence in this member; partial failures can produce divergence among gateway, wallet, ledger, booking, notification and event state.

## CancellationPolicy (lines 671–708)

Lines 675–707 load optional cancel policy and return a stage/actor matrix. Delivered/completed/fulfilled states are blocked; post-dispatch patient cancellation retains a fee; accepted/preparing/payment-completed/ready restores stock; other unknown states default to allowed full refund with no stock restoration (705–706). This fail-open default can authorize cancellation for unrecognized states and should be treated as a truthfulness/security finding unless upstream state normalization guarantees the list.

## ReportsService (lines 710–777)

Lines 714–741 aggregate payments, ledger, refunds and cancelled orders by date. Invalid from/to dates are passed to Mongo date filters without validation. Each aggregation catches errors and returns an empty array/zero (731, 735, 739–740), masking database failures as empty financial reports. Lines 743–777 derive totals; gross_revenue is paid + refunded (749), which may double-count refunded payments depending on business definition, while net_revenue is commission + VAT fields from provider_earning rows (758–774). No currency, timezone, reconciliation, pagination or authorization is implemented in the service itself.

## ApprovalService (lines 779–852)

Lines 783–817 thresholds and request create pending financial operations with required reason, arbitrary type/payload, and admin notification. There is no idempotency key or payload schema/amount bound. Lines 820–821 list up to 100 pending operations. Lines 824–850 decide: loads by id, checks pending and maker-checker requester inequality, rejects with update/event, or calls a caller-supplied executor then updates executed/event. The executor side effect occurs before the status update; concurrent decide calls can execute twice, and executor success followed by status-write failure leaves an operation replayable. No conditional status update/transaction/approval audit signature is shown.

## Controllers and module wiring (lines 854–1024)

Lines 858–893 expose patient/provider-facing coupon validation, loyalty quote and provider balance under JwtAuthGuard. Coupon validation and loyalty quote accept `any` bodies; only positive order_total is checked. Provider balance uses current user id. Lines 895–1014 expose admin reports, commission rules/history/resolve, approval queue/request/decision, refund execution, duplicate-payment scan and provider balance inspection. AdminFinanceEngineController has JwtAuthGuard and Roles(UserRole.ADMIN) (896–899), but several admin endpoints accept `any` bodies and identifiers without explicit validation. `requestApproval` passes arbitrary type/payload to ApprovalService (941–944). `executeRefund` checks approved state, routes large refunds to maker-checker, executes smaller refunds, then updates refund request state with a nonconditional update (973–1000); concurrent execution can duplicate before RefundExecutor’s non-atomic prior check. `dupScan` and `inspectProvider` expose operational financial data to admins (1003–1013).

Lines 1017–1023 mark the module global, register both controllers and all finance services, and export them. No schemas, indexes, transactions, outbox, or global idempotency declaration is visible in this module wiring.

## Confirmed/conditional findings register entries

1. **Critical — non-atomic financial idempotency/saga paths:** Ledger `exists` then `insert`, refund prior-check then gateway/wallet/ledger, provider debit check then append, loyalty refund check then credit/insert, and approval execute then status update are all multi-step sequences without atomic reservation/transaction evidence (101–104, 552–615, 627–635, 404–423, 829–850). This can duplicate money movements or leave divergent states under replay/concurrency/failure.
2. **High — database failures are converted into financial zeros/empty reports:** balance, reports and fraud/aggregation paths catch errors and return empty values (129, 731, 735, 739–740, 498–501 context), masking operational failure and producing untruthful financial output.
3. **High — cancellation fail-open for unknown state:** unrecognized order states default to allowed 100% cancellation without stock restoration (705–706).
4. **High — provider-scoped coupon can validate without provider context:** mismatch is checked only when both IDs are present (269–271).
5. **High — approval and refund inputs are weakly typed/arbitrary:** controller bodies and approval payloads are `any`, and operation type/payload amounts lack schema/tenant/resource binding (941–944, 947–970).
6. **Medium — fraud alert and coupon usage de-duplication are find-then-write / rollback sequences:** no atomic unique enforcement is visible; raw coupon codes are stored in failure records (438–454, 480–486, 294–317).

No product code was changed and no tests were executed during this semantic read.
