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
| PT-19 insurance claim (amount, duplicate) | `j_insurance.py` | PR #2317 branch | claim steps **PASS** (the claim is for what was paid; a second claim is 409). First run 164/166 (the two lab-rejected steps, fixed below); after the fix **PASS 170/170** |
| G1 paid lab booking cancelled is refunded | `j_lab_cancel_refund.py` (new, this PR) | main at `c17aa3461` | **PASS** 52/52: patient cancel and lab cancel each refund the full card payment; a cash booking cancelled has nothing to refund |
| G2 abandoned card payment releases the slot | one-off script, not committed (it waits for the 5-minute sweep) | main at `c17aa3461` | **PASS** 39/39: an unpaid card consultation older than the window is cancelled by the sweeper and its open payment attempt closed |

**The two `j_insurance.py` steps that failed were the API's fault, and are fixed here.** The lab's reject call sends `reason` on `PATCH /labs/bookings/:id/insurance` and the validation pipe refused it (`property reason should not exist`). `LabsService.updateInsuranceApproval` reads `payload.reason` and stores it as the rejection reason, so the field belongs to the contract and `UpdateInsDto` had dropped it. Fix: `reason` (optional string, 500 characters) in `UpdateInsDto`, with `labs-ins-reason.spec.ts`. The provider app does not send `reason` today (`LabDashboard.tsx:1279`); it can now.

**Not run live:** radiology cancel refund (unit tests only, `lab-radiology-refund.spec.ts`), nursing and pharmacy cancel refunds (unit tests only), credit notes and invoices (PRs #2269, #2293, #2307 are not on main yet), `PT-20` coupons (real-MongoDB unit tests; no client flow applies a coupon end to end).

## 6. The money paths from the patient's side (app and web), read 2026-10-31

Method: read the screens and the calls they make. **Read** = I read the code; nothing here was driven in a browser or a device. "Server amount" = the figure comes from a backend response, not from arithmetic in the client.

| Step | Patient app | Patient web | Verdict |
| --- | --- | --- | --- |
| Book, pay by card: consultation | `BookingConfirmForm.tsx`: asks `GET /payments/consultation/:id/capabilities`, then `POST /payments/intent/consultation/:id`, opens the gateway's `checkout_url`, never marks anything paid. The screen shows **no amount** before leaving for the gateway (the file says this is by design). | `ConsultationPaymentAction` shows `payAmountDue` from the capabilities response and the methods the server lists. `booking-flow.tsx` shows the doctor's **fee** of the visit type (not the total: the platform fee and home fees are added by the server, shown at the pay step). | Wired to the real endpoints, server amounts. Gap: the app never shows the amount in-app; the web shows a fee before the total. |
| Lab and radiology | `diagnostics/confirm.tsx`: totals are the server quote's `row.total`; the "due" line is the sum of server totals; the home-fee line is `row.total - sum(lines)` (a difference of two server figures). | `ordering/confirm-client.tsx`: same quotes; the radiology amount is the sum of the server booking totals. | Server amounts. The home-fee line is derived, not sent: a `home_fee` field in the quote would remove the subtraction. |
| Nursing | `nurse-profile.tsx`: the button and the "estimate" row show `nurse.price x sessions`. The button text says "about" in all six languages. The server charges the nurse's own price (else the catalogue price) times sessions. | not read | A disclosed estimate, equal to the charge when the nurse has her own price. No nursing quote endpoint exists (backend gap). |
| Apple Pay, Google Pay | The app asks for `card` only and opens the gateway's hosted page. | Offers whatever the server lists (`card`, `apple-pay`, `google-pay` for a configured gateway). | Web and app differ. Whether Apple Pay shows on the hosted page is the gateway's setting; not verified. |
| Wallet | none | none | **No patient wallet exists** (removed; `patient-allowlist.ts` says the routes are gone). "Pay with wallet" and "top-up" have no screen and no endpoint. `OWNER_DECISIONS_2026-10-06.md` decision on refunds still says "the wallet only if the patient chooses it": needs the owner to say it is out of date. |
| Payment failed, then retry | `payments/result.tsx` reads `GET /payments/status/:ref` (never the link's `status`), has a `failed` state; "retry" for a pharmacy order goes to the payment screen, for every other kind it goes **back** (`router.back()`) to the booking. | `payment-result.tsx`: `failed` state, "retry" goes to the pharmacy payment page or the booking page. | Reads the server status. Since PR #2317 a declined card is reported as `failed`. Retry makes a new attempt on the booking's Pay action (a failed attempt is not "active"). Not verified that the lab, nursing and insurance booking screens offer Pay again. |
| Cancel, then refund status | Consultation: `cancel-reschedule.tsx` shows the server's `refund_now` (PR #2215). Lab and radiology: `diagnostics/booking-status.tsx` shows `payment.refund_status` from the booking, which `RefundExecutor` sets to `REFUNDED` when it refunds. | Consultation: same `refund_now`. Lab and radiology: `ordering/booking-status-client.tsx` shows `refundStatus`. | Server values. Since PR #2267 a paid lab or radiology cancel is actually refunded (journey `j_lab_cancel_refund.py`), so this text is now true. Nursing and pharmacy cancel screens not read. |
| Invoice, receipt | none | none | **No client calls `/billing/*`.** The API is ready (PRs #2269, #2293, #2307: lines, QR, PDF, credit note). Needs the designed receipt screen. |
| Insurance claim status | `insurance/submit-claim.tsx` is a redirect to the hub (owner decision 35: relay-only, "no claims or refunds here"). The status of an insured booking is the insurance **request** (`approval-pending`, `copay`). | no claim screen | No client calls `/insurance/claims*`. See the backend gap below. |

### Client defects fixed in this PR
- **Deleted `patient-app/app/diagnostics/checkout.tsx` and its two tests.** It showed `total` computed in the client (catalogue price x quantity + a home fee) as the amount to pay, while the server charged its own figure. Nothing navigates to it any more (`batch14b-merges.test.tsx` asserts no screen pushes it; grep finds no other caller). Design gates unchanged (`no-literal-ui-string` 136, `client-token-sync` 401, `locale-parity` baseline), patient-app diagnostics tests pass (112).

### Left for others (not fixed here)
- **Client sums before any quote:** `patient-app/app/(tabs)/diagnostics.tsx:206` (cart bar total) and `patient-web/components-next/diagnostics-cart-client.tsx:101` (legacy web cart, continues to `/diagnostics/checkout` on the web, the legacy chain that needs the `d-31` approval to delete). Both show a catalogue-price total that the server may price differently (a lab's own home fee, since #2256).
- **App confirm screen for a consultation shows no amount before the gateway** (needs Design: `capabilities.amount` is already in the response the screen reads).

### Backend gaps
1. `GET /bookings/quote` (`insurance-engine.module.ts:226`) is a stub: it returns the `price` the client sent, plus fixed Arabic text. No client calls it. Delete it, or build a real consultation quote (fee + platform fee + home fees) that both clients use.
2. No nursing quote, and no consultation quote before booking (see above).
3. `POST /payments/retry/:type/:id` has no client (only my journey). `POST /payments/intent` already starts a new attempt when the last one failed. Recommend deleting the route and the journey step.
4. `/insurance/claims`, `/insurance/claims/submit` and `admin/insurance/claims` (+ `:id/decide`, which refunds and claws back the provider) contradict owner decision 35 and have no client (patient app, web, provider app, admin: grep). Only `tools/live/j_insurance.py` calls them. Recommend removal with the live steps; I did not remove them without the owner's word.
5. Quote home fee as a field (see lab/radiology row). `wallet_refund_days_min/max` in `returns_policy` is only a legacy key name for the refund window; rename when the wallet text is cleaned up.
