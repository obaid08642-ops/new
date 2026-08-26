# Provider InsuranceRequestsScreen: manual semantic review

## reviewed source

`src/screens/shared/InsuranceRequestsScreen.tsx`, lines 1–284, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## preliminary outcome

This is a **better aligned UI anchor** than the pharmacy-specific insurance card: it models full approval, partial approval, rejection and patient co-pay states. It is still `STATIC_MATCHED_PARTIAL`, not a closed insurance journey.

| ID | evidence | required closure / risk |
|---|---|---|
| P-INS-001 | 49–50 and 90–92 | reconcile queue/decision routes to backend controller, provider type/organization/assignment checks, request state transition and 401/403/404/409 outcomes; client presence proves none of them |
| P-INS-002 | 70–100 | decision mutation has no visible idempotency/version/conflict guard; duplicate taps/race after a concurrent decision must never create contradictory insurance state |
| P-INS-003 | 73–80, 102–107 | provider enters a percentage and locally previews money from `target.price`; the backend must be the only authority for eligible amount, covered amount, co-pay/currency/rounding and must return the final payable quote |
| P-INS-004 | 17–25, 162–165 | UI recognizes `COPAY_PENDING` and `COPAY_PAID`, consistent with the required order, but no payment intent/webhook/ledger/refund or patient notification evidence is linked here | reconcile post-decision payment chain and ensure service/dispensing cannot start before server-confirmed payment state where required |
| P-INS-005 | 145–170 | patient/policy/service/price data are displayed without static evidence of minimum-necessary disclosure, entitlement, document verification, insurer decision evidence, audit history or reason taxonomy | define PHI/insurance data access policy, role/tenant enforcement, consent/retention and immutable decision audit |
| P-INS-006 | 139–183 | only current list cards are presented; no decision history, expiry, correction/appeal or service-specific capability constraints appear | define lifecycle for full/partial/reject/expired/reversed and provider/admin/patient notifications |

The final plan should retain this screen as a candidate implementation anchor, but rebuild it only after the shared insurance state machine and financial source of truth are approved.
