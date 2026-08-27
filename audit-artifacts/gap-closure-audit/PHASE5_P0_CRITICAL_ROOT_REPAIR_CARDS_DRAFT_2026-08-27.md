# Nabd — Phase 5 P0 critical root repair cards (draft)

**Status:** `ARTIFACTS_ONLY — NOT AUTHORIZATION_TO_EDIT`
**Frozen-scope reference:** `agent/phase4-final-evidence-register @ a3f5f388aeef9e476cbbb07695ff227c45739e25`
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Purpose:** Define bounded source-revalidated repair slices for the highest-risk money, insurance, pharmacy and booking roots. No card is fixed, approved, or runtime-verified. No source code, database, external system, test environment or production system was changed or invoked.

> **Card discipline.** Each card owns one frozen root/subroot. A shared contract may be designed consistently across cards, but a pull request must not silently declare a neighboring root closed. A `derived` relationship is advisory only. A candidate from the incoming workstation snapshot is mapped only after direct baseline/source review—not because a file name or claim is similar.

## 1. Card order and dependency graph

| Order | Card | Frozen root | Primary owner group | Prerequisites | Cannot be declared complete without |
|---:|---|---|---|---|---|
| 1 | `RC-05A1` | `R-05A1` — canonical payment intent/webhook/ledger authority | Payments/Finance + Platform Security | Payment provider contract and finance/ledger owner | Signed webhook/replay/ledger test evidence. |
| 2 | `RC-04A1` | `R-04A1` — insurance request/decision authority | Insurance Orchestration + Provider Operations | `RC-05A1` payment semantics, payer/provider policy owner | Versioned full/partial/reject decision and authorization evidence. |
| 3 | `RC-04A4` | `R-04A4` — co-pay settlement/cancellation lifecycle | Insurance Orchestration + Finance | `RC-05A1`, `RC-04A1` | Ledger/reconciliation and co-pay cancel/reversal evidence. |
| 4 | `RC-06C2` | `R-06C2` — pharmacy inventory/tenant atomic reservation | Pharmacy Inventory + Provider Operations | Inventory data ownership and pharmacy organization model | Concurrent reserve/release/expiry reconciliation evidence. |
| 5 | `RC-06C1` | `R-06C1` — pharmacy cart/offer/order governed journey | Pharmacy Cart/Offer/Order Saga + Patient surfaces | `RC-05A1`, `RC-04A1`, `RC-04A4`, `RC-06C2` | End-to-end customer and counterparty state contracts. |
| 6 | `RC-03A` | `R-03A` — atomic provider/facility/timezone slot reservation | Scheduling/Reservations + Booking Platform | Provider/facility capability and timezone policy | Slot race/expiry/release/reschedule evidence. |
| 7 | `RC-03C` | `R-03C` — unified checkout durable saga/authority | Booking Operations + Workflow Platform | `RC-03A`, `RC-05A1`, `RC-04A1` | Durable compensation/outbox and multi-domain failure proof. |

## 2. `RC-05A1` — canonical payment-intent and verified settlement

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-05A1`; `src/modules/payments/payments.module.ts:160–217,351–405`, `finance-engine.module.ts:117–130,727–740`, `booking-flow.module.ts:154–169`, `booking-ops.module.ts:106–120`, `patient-ux.module.ts:243–267,286–290`. |
| Revalidated condition | `createPaymentIntent` binds ownership to `booking.patient_id` and persists `patient_id`; webhook verifies an HMAC but finds by intent and calls generic verification without a provider-event replay record or explicit webhook-side amount/currency/owner/quote comparison. Privileged bypass roots remain in scope. |
| Incoming delta observation | Pharmacy orders in the incoming snapshot persist `patient_account_id`; its payment intent path reads `booking.patient_id`, creating a concrete owner-field incompatibility. |
| Required server truth | One typed payable aggregate with canonical owner key, immutable quote/version, minor-unit amount and currency, payment method eligibility, stable operation idempotency, payment intent record and ledger reference. |
| Required transitions | `quote_ready → intent_reserved → gateway_pending → authorized/failed/cancelled/expired → settled/reversed`; only verified provider event plus canonical comparison permits `settled`. |
| Authorization | Patient owns only their payable aggregate; finance/admin cannot directly set paid/failed. System webhook authority is provider-signature/event scoped; exceptional remediation uses a separate audited settlement command. |
| Required data work | Explicit canonical aggregate/owner discriminator; unique active intent constraint; unique provider event/replay table; immutable ledger/outbox references; migration/backfill/rollback/reconciliation proposal. |
| Required client behavior | Mobile/Web show `pending`, `unavailable`, `failed`, `cancelled`, `expired` and `settled` from server projections only; no raw PAN, local default instrument, success fallback or optimistic paid state. |
| Minimum test matrix | owner, stranger, unauthenticated, invalid ID/kind, idempotent same-key replay, distinct-key active-intent race, stale quote, amount/currency mismatch, wrong aggregate owner, invalid/duplicate/out-of-order webhook, gateway timeout, ledger/outbox failure, refund/reversal. |
| Runtime gate | Isolated PSP sandbox with raw-body signature; recorded webhook delivery/retry; ledger reconciliation and teardown. Production credential/payment activity is forbidden. |
| Current disposition | `OPEN — implementation and runtime verification required`. |

## 3. `RC-04A1` — insurance request, provider decision and policy authority

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-04A1`; `src/modules/insurance-engine/insurance-engine.module.ts:176–201,266–329,365–421`; `insurance.module.ts:155–210,315–335`; `provider-jobs.module.ts:228–245`; `admin-authority.module.ts:106–145`. |
| Revalidated condition | The baseline insurance request resolves bookings with `{ id, patient_id }`, derives provider/price from booking fields, returns existing requests without command idempotency, and permits a decision when `req.provider_id === user.id` or user role is admin. It has no explicit active provider organization/capability/tenant policy at this operation boundary. |
| Incoming delta observation | Incoming PharmacyOrder uses `patient_account_id`, but the insurance request path still queries `patient_id`; pharmacy insurance requests can therefore fail ownership resolution or be inconsistently modeled. |
| Required server truth | Versioned insurance request tied to canonical subject, policy, service/offer or booking, provider organization/facility and exact quote. Eligibility is fail-closed when unknown; an absent matrix is never universal acceptance. |
| Required transitions | `draft/eligible → pending_provider_review → approved_full | copay_pending | rejected → copay_paid/confirmed | cancelled | appeal_pending`; decisions are serialized with version/CAS and durable event/outbox. |
| Authorization | Patient owner initiates/cancels/resubmits; only an active eligible provider staff member in the assigned organization/facility/service can decide; admin exception follows the same state machine with elevation, reason, evidence, expiry and audit. |
| Required data work | Canonical policy/provider network reference, owner/tenant fields, decision evidence/version/expiry/currency, unique active request/index, provider eligibility record, migration precedence and audit history. |
| Required user outcome | Patient sees authoritative pending/full/partial/rejected result, sanctioned co-pay/cash-or-cancel alternative and expiry; provider/admin see only minimum purpose-scoped projections. |
| Minimum test matrix | patient owner/stranger/unauth, provider without role, provider wrong tenant/facility/service, inactive/expired license, absent/stale policy, duplicate request/replay, concurrent decision, full/partial/reject, re-submit/appeal, admin exception audit. |
| Runtime gate | Approved insurance stub/sandbox and provider-ops user identities; notification/outbox receipt; no insurer live data or credentials. |
| Current disposition | `OPEN — contract/policy/implementation/runtime evidence required`. |

## 4. `RC-04A4` — co-pay settlement, cancellation and reconciliation

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-04A4`; `src/modules/insurance-engine/insurance-engine.module.ts:424–452`; `insurance.module.ts:175–210,338–365,389–448,468–491`. |
| Revalidated condition | Co-pay code inspects a payment record then updates the insurance request, while a listener independently updates it on payment completion. The baseline lacks a demonstrated canonical reconciled downstream cancellation/reversal lifecycle and versioned mutation guard. |
| Required server truth | Co-pay amount comes solely from the versioned approved partial decision; settlement is an idempotent financial command tied to claim/booking/payment/ledger—not a client-supplied amount or payment status. |
| Required transitions | `copay_pending → payment_intent_reserved → paid_and_reconciled → booking/service_confirmed`; `cancelled`, `payment_failed`, `expired`, `reversed/refunded` use explicit compensation/outbox. No service confirmation ahead of reconciled settlement. |
| Authorization | Patient can initiate their own co-pay intent and cancel only permitted states. Insurance/provider/admin decisions cannot write payment success. Finance exceptions require scoped authority, reason and audit. |
| Required data work | Single settlement business reference, version/CAS, idempotency/event uniqueness, cancellation/credit/refund linkage and reconciliation report. |
| Minimum test matrix | full approval/no co-pay, partial approval, reject, no/incorrect/wrong-owner payment ID, duplicate listener/event, concurrent pay/cancel, cancellation before/after payment, amount/currency mismatch, booking-confirm failure after payment, reversal/refund reconciliation. |
| Runtime gate | Executes only after `RC-05A1` PSP/ledger sandbox gate and approved insurance state provider exists. |
| Current disposition | `OPEN — depends on RC-05A1 and RC-04A1`. |

## 5. `RC-06C2` — pharmacy inventory, broadcast and atomic allocation

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-06C2`; `src/modules/pharmacy_ops/pharmacy_ops.service.ts:83–105,118–232`; `compat.module.ts:650–714,923–1024`; `legacy.module.ts:14–21,55–78`. |
| Revalidated condition | Provider pharmacy item updates/recomputes quantity/price directly in order documents. The frozen root records no canonical tenant-scoped atomic reservation/reconciliation boundary for inventory, broadcast and parallel allocations. |
| Incoming delta observation | Incoming `patientSelectOffer` pre-reads the broadcast lock, creates allocation, saves order, and only then runs an unchecked conditional lock update. Two valid selections can create competing state before one lock wins. |
| Required server truth | Eligible organization/facility inventory is authoritative. A current provider offer references an immutable offer revision, inventory reservation token, price/currency, substitution policy, expiry and capacity/delivery policy. |
| Required transitions | `stock_available → offer_issued → offer_selected/reserved → prepared/expired/released`; exactly one patient selection wins. Lost conditional write leaves neither allocation nor selected order state. |
| Authorization | Provider stock/offer actions require active pharmacy organization, facility/branch and staff permission; patient can select only their order’s unexpired offer; Admin reassignment is exceptional/authoritative/audited. |
| Required data work | Tenant-scoped unique/indexed stock record, reservation and offer revision IDs, conditional update/transaction strategy, expiry job/outbox, release/reconcile report and cross-model legacy migration. |
| Required user outcome | Offers show only server-projected availability/substitution/price/ETA/version/expiry. Unavailable, withdrawn, expired and conflict are explicit; UI never invents a selection or stock state. |
| Minimum test matrix | owner/stranger/unauth; wrong pharmacy/tenant/staff; unknown/withdrawn/expired offer; exactly two concurrent valid selections; two inventory reservations; selection after stock withdrawal; conditional lock failure rollback; retry/replay; expiry/release/reconcile. |
| Runtime gate | Isolated Mongo/Redis integration using concurrent clients and deterministic clock; verify no orphan allocation/order/stock state after injected failure. |
| Current disposition | `OPEN — source-confirmed concurrency/authority defect`. |

## 6. `RC-06C1` — governed Pharmacy patient journey

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-06C1`; `src/modules/cart/cart.module.ts:62–226`; `pharmacy_ops.service.ts:149–171`; Mobile `app/pharmacy/drug-not-found.tsx:15–143`; Web `app/[locale]/medicine-catalog/page.tsx:19–44` and `app/[locale]/cart/page.tsx:14–33`. |
| Revalidated condition | Cart summary computes price from stored cart lines; client-facing add/update allows commercial fields; checkout contract accepts cash only, rejects prescription media and clears cart after creating an order. The root’s accepted governing journey is broadcast → offers → exactly one selection → authoritative quote/stock → Cash/Card/COD or insurance decision/co-pay. |
| Incoming delta observation | Web has an offer page but selection mutates during GET render and redirects with hard-coded `/ar`; visible Web COD/insurance continuation is absent. Mobile renders cash/insurance choices but omits them from the actual create order payload. |
| Required server truth | Cart is a non-authoritative intent. Medicine/manual/Rx items must pass catalog/manual-review/Rx eligibility. Submission produces a patient-owned request; only accepted offer revision yields price/stock/payment eligibility. |
| Required transitions | `cart_draft → submitted/broadcasting → offers_available → offer_selected → card_intent_pending | cod_pending_collection | insurance_pending_decision → confirmed/preparing → dispatched/delivered/settled`; rejected/partial/expired/cancel/reselect transitions are explicit. |
| Authorization | Patient owns cart/request/order; provider owns only assigned offer/fulfillment actions; provider/admin actions preserve accepted offer rules; family delegation is purpose/scoped. |
| Required data work | Cart versus request/order ownership boundary, medication/Rx/media reference provenance, offer ID/revision, quote snapshot, payment/insurance linkage, fulfillment/return support and migration/reconciliation plan. |
| Required Mobile/Web behavior | Every CTA uses an intentional non-GET mutation with a stable idempotency key; locale is carried from route; card/wallet/COD/insurance appear only where server capability/status permits; loading/error/empty/blocked/expired/retry/cancel/reselect states are explicit. |
| Minimum test matrix | cart owner/stranger/unauth; manual/Rx required; out-of-area/no pharmacy; add/update/remove replay; broadcast no offers; selected offer success/race/expiry; card, wallet, COD, full/partial/reject insurance; payment failure; cancellation/refund/return; Web/Mobile source contract equivalence. |
| Runtime gate | Full isolated multi-actor E2E after RC-05A1/04A1/04A4/06C2: patient → eligible pharmacy → patient → finance/payer → fulfillment/support. |
| Current disposition | `OPEN — contains baseline capability gaps plus confirmed incoming Web/Mobile defects`. |

## 7. `RC-03A` — atomic booking capacity, hold and reschedule

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-03A`; `src/modules/unified-bookings/unified-bookings.module.ts:127–160`; `slot-locks.module.ts:14–54`; `care/appointments.service.ts:108–187`; `care/slot.service.ts:26–106`. |
| Revalidated condition | Lab/radiology/nursing reschedule reads a booking and directly saves a new timestamp; availability checking returns an available slot but has no demonstrated provider/facility/timezone capacity reservation transition. |
| Required server truth | A slot is a server-owned capacity aggregate with provider/facility/service/kind/timezone/duration/version. A short-lived hold is atomic and binds the correct quote/payment/insurance result before confirmation. |
| Required transitions | `available → held → paid_or_approved → confirmed → completed/cancelled`; holds expire/release/reconcile; reschedule atomically releases old and reserves new capacity. |
| Authorization | Patient owner or scoped guardian may hold/change; provider actions require active organization/facility/service/license; Admin exception is audited. |
| Required data work | Slot/capacity canonical identity, unique interval/exclusion/transaction strategy, hold expiry/release worker/outbox, history/audit and migration/rollback. |
| Minimum test matrix | owner/stranger/unauth; wrong provider/facility/kind/timezone; invalid/past interval; capacity race; hold expiry; payment failure release; insurance pending; concurrent reschedule; cancel/reschedule conflict; daylight/timezone boundaries. |
| Runtime gate | Isolated database/clock concurrency tests plus E2E for cash/card, insurance full/partial/reject and cancellation/reschedule notifications. |
| Current disposition | `OPEN — schedule integrity defect`. |

## 8. `RC-03C` — unified multi-domain checkout saga

| Field | Repair-card content |
|---|---|
| Root / direct baseline evidence | `R-03C`; `src/modules/unified-bookings/unified-bookings.module.ts:300–395`; `booking-flow.module.ts:42–64`; `booking-ops.module.ts:2–24,50–80,83–204`; `doctors.schemas.ts:70–73`. |
| Revalidated condition | The baseline cart checkout loops through heterogeneous groups, catches per-group failures, then tries in-process best-effort cancellation and clears cart lines after success. It allows client/cart commercial fields to drive domain calls and has no durable saga/compensation/outbox proof. |
| Required server truth | A checkout command delegates each domain to canonical booking/order aggregates. It persists idempotent saga state, each step result, compensations, outbox events and a truthful aggregate outcome. |
| Required transitions | `received → validating → reserving → awaiting_payment | insurance_pending | committing → succeeded | compensating | failed_reconciled`; cart is cleared only after authoritative terminal per-line result. |
| Authorization | Patient/guardian authorization is resolved against every domain aggregate. Provider/facility/license/service eligibility is canonical; booking-ops/admin direct payment/insurance marking is removed or converted to gated audited commands. |
| Required data work | Checkout saga ID/idempotency key, per-domain command IDs, state/version, compensation log, event/outbox/inbox, reconciler and migration plan for legacy direct paths. |
| Minimum test matrix | single/multi-domain owner flows; partial domain failure; duplicate request/replay; concurrent checkout; compensation success/failure/retry; outbox failure; cart clear only after terminal outcome; provider/license mismatch; wrong price/slot/insurance input. |
| Runtime gate | Isolated DB/queue integration with fault injection, then multi-surface E2E. No production cart/order/booking data may be used. |
| Current disposition | `OPEN — cross-domain saga and authority defect`. |

## 9. Common review checklist for any implementation PR

A PR for one card is rejected if it lacks an approved owner/decision, changes an unrelated root, makes a source-only assertion of production readiness, or omits the exact controlled outcome below.

| Evidence package | Required content |
|---|---|
| Differential source evidence | Immutable base/head, changed-path list, root/card ID, line-level before/after explanation and explicit non-goals. |
| Contract/state package | DTO/event schemas, state transition table, exact controller/service/schema paths, authorization matrix and source-of-truth mapping. |
| Data/rollback package | Index/migration/backfill/reconciliation/rollback plan; no destructive migration without rehearsal. |
| Test report | Source hash, hermetic command, fixtures, raw output, skip list, owner/stranger/unauth/replay/race tests and isolated external proof where required. |
| UX/accessibility package | CTA/state matrix for patient Mobile/Web and required provider/Admin operational actions, locale/RTL/a11y and no-fake-success proof. |
| Operations package | Feature flag/expiry/owner, metrics/alerts/log redaction, support/finance/provider runbook and rollback trigger. |

## 10. Explicit non-closure

These cards do not close remaining roots beyond the seven named ones. Provider and Admin user interfaces remain `BLOCKED_INPUT` until complete source is supplied. The current incoming workstation claims/history remain `UNVERIFIED_CLAIM` until a replayable original history or verified patch/bundle arrives. All cards remain `NO-GO` until G1–G8 evidence defined in the approved Phase 5 plan is completed.
