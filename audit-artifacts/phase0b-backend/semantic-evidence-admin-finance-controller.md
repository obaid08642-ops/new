# Phase 0B semantic evidence — admin-web-core/controllers/finance.controller.ts

**Archive member:** `src/modules/admin-web-core/controllers/finance.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–149; full member covered.

Lines 1–7 import Nest/Mongoose/controller primitives, CommissionLedger/WithdrawalRequest models, LedgerService/ApprovalService and CurrentUser. Lines 9–19 document the intended fix: merge legacy and provider-ops withdrawal sources, append payout ledger entries, reject insufficient balances and route large payouts through maker-checker.

Lines 21–30 declare `FinanceController` and inject legacy/provider withdrawal models, connection, ledger and approval services. No class-level JwtAuthGuard/Roles decorator is present in this member; authorization may be inherited from global guards or module/controller configuration elsewhere and must be verified, not assumed.

Lines 32–36 expose commissions with an unbounded model find and no pagination/filter/field minimization. Lines 38–69 merge pending legacy and provider-ops withdrawals, normalize fields and return provider names, amounts, bankName and IBAN. This is admin operational PII/financial data and has no explicit projection for legacy data or audit/pagination in this controller.

Lines 71–104 execute payout: resolve legacy by id or provider-ops pending state, derive provider/amount, compute provider balance, require a matching locked reservation for provider-ops, and route large payouts through ApprovalService. Lines 106–128 mark payout completed/paid and clear provider reservation before checking/adding a payout ledger entry. Legacy execution uses `findByIdAndUpdate` without a pending-state conditional; repeated/concurrent calls can race with the ledger check. Provider-ops state update, reservation clear and ledger append are separate writes; failure between them can leave paid state without cleared ledger or reservation, or replayable state. Large-payout routing calls `approvals.request` without a visible idempotency key and repeated calls can create duplicate approval operations.

Lines 119–127 use ledger `exists` then append for legacy, so the duplicate guard is not atomic. Provider-ops sets `dup=true` and relies on the locked reservation being cleared, but no atomic claim is shown across state transition, reservation state and payout ledger. Admin identity uses `admin?.id` and falls back to literal `'admin'` in descriptions/actor fields (102,124), which weakens audit attribution if the identity is absent.

Lines 131–147 reject payout. Legacy uses `findByIdAndUpdate` without a pending-state filter and without a reason/audit actor. Provider-ops uses a conditional pending-state update and releases a matching locked reservation. The body is `any`, reason has no length/content validation, no idempotency key is visible, and legacy/provider-ops rejection behavior is not transactionally coupled with reservation release.

**Audit judgment:** Controller demonstrates balance/reservation/maker-checker intent and has meaningful source separation, but it does not establish atomic exactly-once payout/rejection, authenticated role enforcement at this boundary, bounded admin PII response, or replay-safe large payout routing. These are findings/verification requirements, not remediation.

No product code was changed and no tests were executed during this semantic read.
