# Phase 0B semantic evidence — Insurance flow, quote and refund specs

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/insurance-engine/tests/insurance-flow.spec.ts:1–291`

The file covers three service surfaces. `InsuranceFlowService` uses mocked request/transaction/order repositories and a shared mocked event emitter (`17–34`). It tests deriving provider/price from an owned pharmacy order rather than forged client values, provider/admin decision paths, full/partial approval and copay calculation, invalid percentages, rejection rules, unknown decision, non-owner denial, already-decided/not-found cases, copay payment verification, wrong payment/state handling and patient cancellation (`36–200`). These assertions provide useful mock-level evidence for selected ownership/state and server-authoritative price/payment checks.

`QuoteController` tests clinic cash/online methods, online-only channels, optional insurance, and default clinic/SAR behavior across a channel list (`202–233`). `RefundService` tests refund windows using `Date.now`, full/partial/zero policy boundaries, computed refund amount, duplicate active-request return and basic input rejection (`235–290`).

The file does not prove authenticated HTTP guard behavior, complete patient/provider/admin/insurer ownership or role matrices, transaction/session atomicity, compare-and-set under concurrent decisions/payments/cancellations, payment-gateway settlement or webhook truth, idempotency-key/replay equivalence, refund ledger/inventory effects, fraud behavior beyond a false mock, currency/rounding/tax policy, booking/order eligibility, attachment/PII handling, event/outbox durability, notifications, timezone/clock injection, live database or deployed API behavior (`28–34,58–200,238–290`). Quote tests pass client-supplied prices and do not establish server pricing truth, all unsupported channels, insurance eligibility or live payment-method policy (`205–232`). No code was changed and no build/test/application operation was performed during this read.
