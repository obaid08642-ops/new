# Price a patient sees against the price the checkout charges (step 3, 2026-10-29)

Checked on the local stack (main build), by reading the booking code and the data of the latest paid visits. Not every screen was walked; the table says which were.

| Service | Price shown | Price charged | Status | Finding |
|---|---|---|---|---|
| Consultation (clinic) | Doctor's `price_clinic` 10 SAR (`GET /care/doctors/:id`) | Appointment price 10, transaction 10 SAR (3 latest paid visits) | CONSISTENT | None. |
| Lab test | Catalogue price 110 (list, comparison, compatible-providers) | Catalogue price 110: `backend/src/modules/labs/labs.service.ts` `book()` uses the lab's own price only when it has a capability row, which none has (see #2088) | CONSISTENT, WRONG VALUE | P1: lab A set 95 and lab B 130 at registration, and the patient pays 110 at either. The price the lab set is not applied anywhere the patient sees or pays. Root cause: `docs/qa/findings/provider-services.md` gap 1 (fix #2088 not yet effective for prices). |
| Nurse service | Catalogue price 100 (list) | The booking is charged at the catalogue service price (`backend/src/modules/home-care/home-care-compat.module.ts:104-105`) | CONSISTENT, WRONG VALUE | P1: the nurse set 150 and 120 at registration, and neither is shown or charged. Same root cause as gap 7 in `provider-services.md`. |
| Radiology scan | Catalogue price (list) | Not checked on the checkout yet. The booking code follows the same rule as labs (own price, else catalogue) | NOT VERIFIED | Expected the same as labs: centres set 210 and 190, neither applied. Confirm with a booking. |
| Insurance copay | The copay on the request (`GET /insurance/requests/:id/capabilities`) | 500 SAR cap on an 850 SAR scan at 70 % (after #2086) | CONSISTENT | Fixed by #2086 (`tools/live/j_qa_copay_cap.py` 39/39). No estimate is shown before booking: `GET /bookings/quote` has no copay field (P2, `docs/qa/findings/insurance-copay.md`). |
| Pharmacy order | Offer prices | Not checked | NOT DONE | Next step: compare an offer's total with the payment, including the delivery fee. |
| Doctor penalty and refund | Preview percentage | Ledger refund (late cancel) | CONSISTENT on the patient side; console mismatch | The console's full refund returns 100 % after a 50 % late cancel (REF-PEN-1, #2085, now fixed: 40/40). |

Open for step 3: radiology checkout (confirm with one booking), pharmacy offers and delivery fee, the consultation insurance estimate (P2), and the lab/nurse own prices (P1, needs #2088 to take effect).
