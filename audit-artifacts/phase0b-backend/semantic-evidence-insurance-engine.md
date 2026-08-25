# Phase 0B semantic evidence — Insurance engine, refunds and finance core

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/insurance-engine/insurance-engine.module.ts:2–656`

The module embeds insurance request/refund/ledger/commission schemas, finance core, quote controller, insurance flow service/controllers, aliases, refund service/controllers and admin finance/insurance surfaces (`insurance-engine.module.ts:29–656`). Quote determines allowed payment methods from caller-provided channel/price/service query and returns the caller-derived price, while server-side booking linkage is not visible in this quote surface (`171–201`).

Policy save persists company/plan/member/policy/card image data into the patient profile with no visible typed bounds or ownership issue beyond current user ID (`232–253`). Insurance request creation links to a patient-owned booking across order/lab/radiology/home-care/appointment models, derives provider and price from the booking, checks policy, and uses a read-before-create duplicate query (`256–289`). Resubmit/appeal append raw documents/reasons and save state/history separately from event emission (`292–329`). Provider queue is provider-ID scoped; admin lists/stats return broad request documents/sums (`332–356`).

Provider decisions and copay payment use read-then-save state transitions. Copay payment checks a transaction by patient/request/amount, but no visible idempotency/current-state atomic predicate is present (`365–421`). Verified payment event settlement likewise reads request/payment then saves and emits (`424–443`). Cancel saves state without event (`445–452`). Several aliases duplicate payment operations (`456–517`).

Refund request trusts caller-supplied booking ID, amount paid, scheduled time and payment ID after only basic checks; duplicate lookup is booking-wide rather than visibly patient/merchant scoped. Policy computes refund from client-supplied scheduled time when supplied. Refund decision and finance accrual lack visible role decorators, actor scope, idempotency or ledger transaction binding; finance accrual accepts raw body and computes commission using configured/default rates (`519–626`). Admin finance/insurance controllers have JWT guards but no visible role decorators (`597–617`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: quote price trust, policy/card PII handling, insurance request state/idempotency races, raw document storage, duplicate payment aliases, refund abuse and ownership gaps, missing admin/finance role enforcement, and non-atomic ledger/refund settlement.
