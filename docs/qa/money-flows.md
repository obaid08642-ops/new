# Money flows audit (session F, 2026-10-31)

Scope: every path that charges, refunds, credits or pays out, for consultation, home visit, lab, radiology, nursing and pharmacy, read on `main` at `9e3bae0b`.
Method: each path was read in code (file and function named). **Verified** means I read the code that does it. **Not verified** means I did not read it or could not trace it. No production data was touched.

The rule being checked, per path: *amount shown = amount charged = amount refunded on cancel = provider credit + commission + VAT*.

## 1. Rules the code follows today

| Step | Where | Rule |
| --- | --- | --- |
| Charge | `payments.module.ts` `createPaymentIntent` | Consultation (incl. home visit): `total_price` (fee + platform service fee + home-visit + transport). Lab, radiology, nursing, pharmacy: `total`. Insured lab/radiology/nursing after approval: `insurance_copay`. Governed pharmacy: `pharmacyDueAmount` (quote total, or the accepted co-pay). Split wallet+card pharmacy: total minus `wallet_applied`. Fixed in #2212. |
| Gateway check | `verifyPayment`, `gatewayAmountMatches` | A paid answer whose amount differs from the transaction is stored as `failed` (`gateway_amount_mismatch`), never as paid. |
| Credit | `provider-ops.module.ts` `creditCompletedService` + `creditEarning` | On `service.completed`: collected amount, capped at the provider's own price lines (`providerOwnAmount`). `net = gross − commission − VAT`, where `commission = gross × pct` and `VAT = commission × 15%` (VAT on the commission only). Goes to escrow (`state: pending`) until the settlement delay. Idempotent per booking. |
| Commission | `creditEarning` → `commissionFor` → `CommissionResolver` | Campaign or provider rule → rate set on the provider (cash / insurance) → service default → system default (one order, F.6). |
| Pharmacy credit | `pharmacy-allocation.service.ts` `settleDeliveredAllocation` | Same formula on `a.totals.total`; COD books a `provider_debit` of commission + VAT instead. |
| Refund | `RefundExecutor.execute` | Idempotent per `refund_id`; capped at the amount paid; card refunds go to the gateway; reverses the provider credit as a debit. |
| Patient invoice | `billing.module.ts` `issue` | VAT is extracted from the whole total as 15% inclusive. |

## 2. Path table

`✔` verified OK · `✘` gap found (section 3) · `?` not verified.

| Path | Amount shown = charged | Refund on cancel | Provider credit + commission + VAT | Test |
| --- | --- | --- | --- | --- |
| Consultation (video, clinic) | ✔ `total_price` shown and charged (#2212) | ✔ `appointment.refund.calculated` → `AppointmentRefundListener`, policy % of the amount actually paid, late cancel goes to source | ✔ credit on `price` only; service fee stays with the platform | `payment-charged-amount.spec.ts`, `appointment-refund-fields.spec.ts` |
| Consultation, home visit | ✔ same total; home and transport fees from the provider's own fee else platform (#2256, open) | ✔ same listener | ✘ **G4**: home-visit and transport lines are excluded from the credit (`providerOwnAmount`), so a doctor's own home fee is charged but not paid to them | none for the credit |
| Lab | ✔ `total`; own home-collection fee else platform (#2256) | ✘ **G1** was: no refund on any cancel. Fixed here | ✘ **G4** same for the home-collection fee | new: `lab-radiology-refund.spec.ts` |
| Radiology | ✔ `total` (ordering splits by kind, #2257) | ✘ **G1** was: none. Fixed here. `SCAN_ABORTED` still only "notifies" (**G5**) | ✔ service total, no home fee | new: `lab-radiology-refund.spec.ts` |
| Nursing | ✔ `total` | ✔ `NursingRefundListener`: 100% before transit, minus trip fee after | ✔ credit on `total` | `nursing-pharmacy-refund.spec.ts` (new) |
| Pharmacy (governed) | ✔ `pharmacyDueAmount` | ✔ `PharmacyRefundListener`: 100%, minus delivery fee once out for delivery | ✘ **G6**: commission read from `finance_config.service_types.pharmacy.percent ?? 10`, not the one resolver; ignores provider rates `nursing-pharmacy-refund.spec.ts` (new, refund only); none for the commission source |
| Insured copay (lab, radiology, nursing, pharmacy) | ✔ copay after approval | ✔ executor refunds the copay transaction, capped | ✔ credit capped at the copay | `payment-charged-amount.spec.ts` |
| Abandoned or failed card payment | n/a | ✘ **G2** was: an unpaid card consultation stayed `PENDING` and held the slot for ever. Fixed here | n/a | new: `payment-abandon.spec.ts` |
| Payout | ✔ one state machine (F.5) | n/a | ✔ | `finance-suite.payouts.spec.ts` |

## 3. Gaps found

- **G1 (fixed here): a paid lab or radiology booking cancelled by the patient or the lab was never refunded.** `lab.booking_cancelled` had no listener; the radiology cancel emitted nothing. New `LabRadiologyRefundListener` refunds the card payment in full (a lab collector already on the way keeps the trip fee, same as nursing), idempotent per booking, failures go to `event_dlq`. The lab provider's own cancel (`transition` to `CANCELLED`) now emits too.
- **G2 (fixed here): an abandoned or failing card payment never released the slot.** New `PaymentAbandonService` (every 5 min, `PAYMENT_WINDOW_MINUTES`, default 30) asks the gateway one last time, then cancels the open attempts and the unpaid `PENDING` consultation. A payment that lands after the release is refunded in full. Lab, radiology and nursing do not hold a calendar slot while unpaid, so they are not swept (**not verified** for nursing provider holds).
- **G3: the patient invoice is not tied to the payment.** `BillingService.issue` does not check that the booking is paid, uses the booking total instead of the charged amount (an insured booking is invoiced at the full price, the patient paid the copay), reads `Order` only (governed pharmacy orders live in `pharmacy_orders`), hard-codes 15% instead of `tax.vat_percent`, and nothing issues it automatically on `payment.completed`. See the invoice section of the go-live notes.
- **G4 (open, needs #2256 merged first): the provider's own home-visit, transport and home-collection fee is charged but not credited.** After #2256 the patient pays the provider's own fee, but `providerOwnAmount` excludes those lines. Recommendation: mark the line as "provider's own" on the booking when it comes from the profile and include exactly that line in the credit.
- **G5 (owner decision): `SCAN_ABORTED` "triggers a refund" only in a comment.** Nothing refunds. Whether an aborted scan is refunded fully, partly or by hand is a policy question.
- **G6 (open): pharmacy commission bypasses the commission resolver** (see table).
- **G7 (owner / accountant): VAT.** The provider side takes VAT on the commission only; the patient invoice extracts 15% from the whole price. These two cannot both be the platform's VAT position. I did not change either.

## 4. Not verified in this audit

- Wallet top-up and wallet refunds (the executor says there is no patient wallet branch any more; legacy `wallet_applied` on pharmacy still exists).
- The `service.completed` credit for nursing and radiology bookings with several payments.
- Gateway behaviour against Moyasar itself (no keys here).

## 5. Live journey results (session F, 2026-10-31)

Run by hand on the CI recipe (`.github/workflows/live-gate.yml`) in one container: MongoDB 8 replica set, Redis, moto (S3), SMTP sink, ClamAV and Moyasar doubles, the built backend, the admin BFF in `next dev`. Patient web was not started (none of these journeys use it). The shared `j_*` helpers ran as well (doctor and lab onboarding), so step counts include them. Seeds: `seed_admin.js`.

| Scenario / gap | Journey | Build | Result |
| --- | --- | --- | --- |
| PT-23 declined card, then retry | `j_payment_failed_retry.py` | PR #2317 branch | **PASS** 46/46 |
| PT-15 dispute on a charge | `j_dispute.py` | PR #2317 branch | **PASS** 56/56 |
| PT-19 insurance claim (amount, duplicate) | `j_insurance.py` | PR #2317 branch | claim steps **PASS** (the claim is for what was paid; a second claim is 409). Whole file 164/166: **FAIL** "lab rejected: the lab records the outcome" and "the booking links to the insurance request engine" |
| G1 paid lab booking cancelled is refunded | `j_lab_cancel_refund.py` (new, this PR) | main at `c17aa3461` | **PASS** 52/52: patient cancel and lab cancel each refund the full card payment; a cash booking cancelled has nothing to refund |
| G2 abandoned card payment releases the slot | one-off script, not committed (it waits for the 5-minute sweep) | main at `c17aa3461` | **PASS** 39/39: an unpaid card consultation older than the window is cancelled by the sweeper and its open payment attempt closed |

**The two `j_insurance.py` failures are not from these changes.** The journey sends `reason` on `PATCH /labs/bookings/:id/insurance` when the lab rejects; the validation pipe refuses it (`property reason should not exist`). The provider app never sends `reason` there (`LabDashboard.tsx:1279`), so the journey, not the app, is out of step with the API. Left for the owner of that journey; I did not touch it.

**Not run live:** radiology cancel refund (unit tests only, `lab-radiology-refund.spec.ts`), nursing and pharmacy cancel refunds (unit tests only), credit notes and invoices (PRs #2269, #2293, #2307 are not on main yet), `PT-20` coupons (real-MongoDB unit tests; no client flow applies a coupon end to end).
