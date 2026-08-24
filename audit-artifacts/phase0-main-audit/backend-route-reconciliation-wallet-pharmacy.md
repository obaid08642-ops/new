# Backend route reconciliation — Wallet and patient Pharmacy

Baseline backend source: `main @ 22526bedb77a3d8148219036367e4714f401aecc`. This is audit evidence only; no backend changes were made.

## Wallet controller

`nabdah-backend/src/modules/wallet/wallet.controller.ts:5–7` places every wallet route under `wallet` and applies `JwtAuthGuard`. The controller derives `ownerType` from `user.role` (`:12–14,19–26,37–38,56–57,63–64,70–71,77–78`), which is an important backend boundary but is not equivalent to a Mobile patient-only assertion; provider roles are intentionally admitted to the same controller.

The actual routes are `GET /wallet/balance`, `GET /wallet/transactions?page&limit`, `GET /wallet/spending-data`, `POST /wallet/topup`, `POST /wallet/topup/confirm`, `GET /wallet/topup/:id`, `POST /wallet/transfer`, `GET /wallet/cards`, `POST /wallet/cards`, and `DELETE /wallet/cards/:id` (`:10–79`). This confirms that Mobile transaction pagination exists server-side, while the Mobile screen does not pass page/limit or expose pagination/detail. Top-up is split into intent and confirmation (`:34–46`), but the controller body types contain only amount/paymentMethod and topup_id; no visible Idempotency-Key/header, currency, owner assertion, or amount-bound assertion appears in the controller. `if (!body.amount)` accepts any truthy amount; range/decimal/currency policy is delegated and not visible here.

`POST /wallet/transfer` accepts free-text `recipient` and numeric `amount` (`:53–59`) and returns only `{ success, balance }`; no receipt, pending/unknown outcome, beneficiary identity, idempotency, step-up, or settlement state is expressed at this boundary. `POST /wallet/cards` accepts `body: any` (`:68–73`), so tokenization/PCI-safe input and schema constraints are not established by this controller. Card removal is ownerType-scoped through the service but returns only the resulting cards (`:75–80`), with no idempotency/version/reconciliation contract visible.

## Patient pharmacy controller

`nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts:5–7` exposes `GET /patient/pharmacy/shortage-flags/lookup` behind `JwtAuthGuard`. Its handler passes `undefined` as the patient argument to `lookupForPatient` (`:10–13`) and returns either one flag or an empty array. This is a direct ownership/identity reconciliation concern: the route is authenticated, but the controller does not visibly bind the lookup to `CurrentUser` or a patient ID. It is a lookup only; no shortage request creation, prescription upload, quote, alternative-consent or request-status mutation is present in this controller.

## Reconciliation disposition

These controller observations corroborate Mobile F-091/F-092/F-093 and do not close them. Exact service implementation, DTO validation, guards, global idempotency interceptor, persistence/ledger, and live owner/stranger/unauth tests remain required. No Phase 0 remediation was made.
