# Refund after a late cancellation: P1 (reproduced on the local stack, 2026-10-29)

Journey: `tools/live/j_qa_refund_penalty.py`. A paid clinic visit starts inside the 2-hour window; the patient cancels; the cancellation's preview says 50 % (the default late-cancel share). The admin then refunds in full through the orders console.

| ID | Severity | Finding | Evidence | Fix (owner decision first) |
|---|---|---|---|---|
| REF-PEN-1 | P1 | The admin console's "full" refund returns 100 % of the payment after a late cancellation. The cancellation computed 50 %; the patient gets 100 %, and the penalty is lost. | Run 2026-10-29: paid 10 SAR, preview 50 %, console refunded 10 SAR. Code: `backend/src/modules/admin/enterprise/orders-console.service.ts:369` (`full` = `maxRefundable`, the whole remaining payment), with no reference to the cancellation's `refund_percentage` (`backend/src/modules/care/appointments.service.ts:556-575`). | Either the console's "full" uses the cancellation's percentage, or the admin must choose "partial" with that amount. Decide which, then make the console say so. |

Notes:
- The patient-facing cancellation itself works: the preview states 50 % and MongoDB stores `refund_percentage` 50 (journey steps pass).
- A 100 % cancellation (free window) refunds 100 %, which matches the policy.
- Penalty amounts (`penaltyAmount`, doctor cancellations) are not checked here.
