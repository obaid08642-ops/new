# Cancellation and refund matrix (session F, 2026-11-02)

Journey: `tools/live/j_refund_matrix.py` (458 steps, green on the seeded stack; joins the gate). Numbers: refund policy 3.0 (`docs/legal/05_CANCELLATION_REFUND.en.md`, defaults in `backend/src/modules/refund-policy/refund-policy.defaults.ts`).
Each cell checks three views: **the patient** (refunded amount on the payment, status, the refund document on the invoice: a credit note, or a refund receipt `RRC-` while the platform has no VAT number, which is this stack), **the provider ledger** (no earning for a service not delivered; the deduction where one is due), **the platform** (commission and the VAT on it: none was earned before delivery, so nothing to reverse; reversed in proportion after delivery).

| Service | Before the deadline | After the deadline | Provider no-show / cancels | COD after dispatch |
| --- | --- | --- | --- | --- |
| Consultation, clinic | 100% | 50% (window widened to 1000 h by the admin so tomorrow's slot is "late"; restored) | 100% + doctor deduction 50 SAR | n/a |
| Consultation, video | 100% | 50% | 100% + deduction 50 SAR | n/a |
| Home visit (doctor) | not run live: needs the doctor's home hours; the same `calculateRefund` code path as the clinic | | | n/a |
| Nursing | before the nurse sets off: 100% | after set-off: 100% minus the trip fee 40 | the nurse rejects: 100% (was **no refund**, see P0-1) | n/a (cash refused for a home visit) |
| Lab, home draw | before the collector sets off: 100% | after set-off: 100% minus 40 | the lab cancels after set-off: 100% (was minus 40, P1-1); `/provider/jobs/lab/:id/reject`: 100% | n/a |
| Radiology | before the scan: 100% | (policy 3.0 has no row for radiology) | the centre cancels: 100%; `/provider/jobs/radiology/:id/reject`: 100% | n/a |
| Pharmacy, **platform** delivery (fee 15) | before dispatch: 100% incl. the fee | after dispatch: 100% minus the fee | the pharmacy cancels: 100% (was **order marked delivered, no refund**, P0-2) | COD cancelled after dispatch: nothing collected, nothing refunded, no refund document |
| Pharmacy, **pharmacy_own** delivery | settlement and documents by mode: `pharmacy-settlement-delivery.spec.ts`, `billing-invoice-api.spec.ts`. Not live: no offer is written with `pharmacy_own` until P2 builds the pharmacy side | | | |
| After delivery (consultation, admin refund of half) | provider debited its net share, the platform's commission share and the VAT on it reversed; net + commission + VAT = the provider's own lines of the refund | | | |

## P0 / P1 found and fixed in this PR
| | Where (on `main` before this PR) | Defect | Fix |
| --- | --- | --- | --- |
| **P0-1** | `backend/src/modules/provider-jobs/provider-jobs.module.ts:251` (`reject` → `act`, which saves the entity directly) | A nurse (or pharmacy, lab, radiology) rejecting or cancelling a PAID booking through the generic provider action never refunded it: the patient's card payment stayed `paid`. Only `lab.booking_cancelled` / `homecare.booking_cancelled` / `pharmacy.order.cancelled` fed the refund listeners and this path emits none. | `ProviderCancelRefundListener` (`finance-engine.module.ts:1060`) listens to the universal `service.cancelled` for a non-patient actor and refunds what was paid in full, under the same refund id as the kind listeners (never twice). |
| **P0-2** | `backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts:635` (`refreshOrderAfterAllocationChange`) and `:614` (`cancel`) | When the pharmacy cancelled its only allocation, `allDelivered` (every allocation delivered, cancelled or rejected) was true: the order was marked **DELIVERED** and the patient was not refunded. | `allDelivered` needs one real delivery (`:663`); a pharmacy cancel with no live allocation left cancels the order as a provider cancel (`:637`), which the listener above refunds in full. |
| **P1-1** | `finance-engine.module.ts:1382` (`LabRadiologyRefundListener`), `labs.service.ts:724,751` | The lab cancelling or not attending after its collector set off still kept the 40 SAR trip fee from the patient (policy 3.0: the provider cancels or does not attend: 100%). | the cancel events carry `cancelled_by`; only the patient's own cancel keeps the fee. |
| **P1-2** | `finance-engine.module.ts:783` (`RefundExecutor`, provider clawback) | The share clawed back was `refund / earning.gross`; the earning's gross is only the provider's own lines (platform fees are not in it), so refunding half of a payment took back ALL of the provider's net. | the share is `refund / amount paid` (`:787`). |
| **P1-3** | `finance-engine.module.ts:792` (new) and `ReportsService.summary` | The platform's commission and the VAT on it were never reversed on a refund: the finance report kept counting them for refunded orders. | `commission_reversal` / `vat_reversal` ledger rows in the same proportion (provider net share + commission share + VAT share = the provider's own lines of the refund); the report subtracts them. |
| **P1-4** | `backend/src/modules/admin/enterprise/orders-console.service.ts:410` (now `:412`) | The admin console refund mirrored the payment with the status it had read BEFORE the refund: a partial refund put the card transaction back to `paid` (with `refunded_amount` set). | `partially_refunded` for a transaction row. |

## Found, not fixed (owner, or another session)
- **P1-5 Retained delivery fee after dispatch is recorded nowhere.** `PharmacyRefundListener` (`finance-engine.module.ts`, `amount = dispatched ? total - fee : total`) refunds total minus the fee; no ledger row records who keeps the fee (platform revenue and its VAT, or, for `pharmacy_own`, the pharmacy's courier compensation). Needs the owner's rule and the P2 side.
- **P1-6 Provider no-show deduction exists only for doctors** (`appointments.service.ts:597`, 50 SAR). Nursing, lab, radiology and pharmacy have none and policy 3.0 names no number: the cells assert deduction 0 today. Owner decision needed.
- **P2-1** `GET /payments/booking/pharmacy/:id` (`payments.module.ts:719`) reads the legacy `orders` model: it answers nothing for a governed pharmacy order. The journey reads the invoice for the same figures.
- **P2-2** `AppointmentsService.previewRefund` (`appointments.service.ts:560`) estimates from `total_price` rounded to whole riyals while the refund is computed on the paid transaction.
- **P2-3** Policy 3.0 has no row for lab and radiology; the code refunds 100% before the service and, for the lab, minus the trip fee after set-off.
- A refund of an order that was already settled to the provider's available balance claws back from `available`, not from `pending`: during the escrow days the available balance can go negative while the earning is still pending (it matures later, the total is right).
