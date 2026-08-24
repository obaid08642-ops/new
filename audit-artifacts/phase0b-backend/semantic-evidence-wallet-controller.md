# Phase 0B semantic evidence — WalletController

**Archive member:** `src/modules/wallet/wallet.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–81 from the baseline archive extraction.

Lines 1–8 define a JWT-guarded `wallet` controller and inject `WalletService`. Lines 10–27 expose authenticated reads for balance, paginated transactions, and spending data. The controller derives `ownerType` from `user.role`, mapping `patient` to `patient` and every other role to `provider`, then passes `user.id` and that owner type to the service.

Lines 29–40 expose `POST /wallet/topup`. The comment states this is a real purchase and creates a gateway payment intent; the balance is intended to be credited only after confirmation. The body is an untyped `{amount, paymentMethod?}` shape, validation only checks truthiness of `amount`, and `paymentMethod` is not used by the controller. The response merges the service intent into `{success:true, requires_payment:true}`.

Lines 42–46 expose `POST /wallet/topup/confirm` with a raw `{topup_id}` body and authenticated user ID. Lines 48–51 expose `GET /wallet/topup/:id`. Lines 53–59 expose `POST /wallet/transfer` with raw recipient/amount, truthiness validation, role-derived owner type, and a response containing success plus resulting balance. No `Idempotency-Key` header is read or enforced in this controller for topup, confirmation, or transfer.

Lines 61–80 expose authenticated card reads, add, and delete. Card add accepts `any`; ownership is represented by the current user ID and role-derived owner type. Responses return full `cards` arrays from the service; the controller does not redact fields or establish payment-provider tokenization semantics.

**Routes/events:** `GET /wallet/balance`, `/transactions`, `/spending-data`, `/topup/:id`, `/cards`; `POST /wallet/topup`, `/topup/confirm`, `/transfer`, `/cards`; `DELETE /wallet/cards/:id`.

**Auth/ownership:** controller-level JWT guard; current user ID is passed to service for all operations. `ownerType` treats all non-patient roles as provider, which is a role-partitioning assumption requiring service and authorization verification.

**State transitions:** topup intent → gateway payment confirmation → wallet credit; transfer changes balance; card add/remove changes stored payment methods. Exact idempotency/replay semantics are not visible here.

**Price/payment/insurance source:** topup amount is client-supplied to the controller and passed to service; the controller does not calculate or verify server-side limits/currency. Payment intent semantics are delegated to service. No insurance handling is visible.

**Test implications:** require unauthenticated 401; owner/stranger 404 or equivalent non-disclosure for topup/card resources; amount boundary and currency tests; topup replay/idempotency; confirm replay and ownership; transfer replay and insufficient funds; role isolation; card secret/token redaction; pagination validation; and gateway-confirmed credit only. No tests executed during this semantic read.

**Consumer traceability:** deferred to the dedicated route-to-consumer phase.
