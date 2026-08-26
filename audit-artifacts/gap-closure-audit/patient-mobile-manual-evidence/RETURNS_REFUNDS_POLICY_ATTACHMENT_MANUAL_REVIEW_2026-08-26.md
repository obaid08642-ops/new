# Patient Mobile: Returns, refunds and policy — manual review

## Scope boundary

This read-only source review covers all three Returns inventory routes. It does not establish refund eligibility, order ownership, payment/ledger settlement, tax treatment, provider review, policy authority, attachment retention/scanning, payment-rail return, or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/returns/hub.tsx` | Return list, status/policy summary and navigation |
| `app/returns/new-request.tsx` | Multi-service return/refund request creation |
| `app/returns/detail.tsx` | Return detail and client timeline |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-RET-001 | `CONFIRMED_DEFECT` | `returns/new-request.tsx:19–48, 63–103, 209–225, 275–286` | Request supports several service types but posts every case to `/pharmacy/returns`; client hard-codes policy/rates, refund amounts by service type, payout durations and reasons. Attachments are local text placeholders without upload. A successful response creates a fake `RET-…` reference from `Date.now()` and promises review timing without server state. | Per-service return/refund contract and state machine; server authoritative eligible order/amount/policy/payout method; attachment upload/scanning/ACL; returned case ID/status/audit and idempotency tests. |
| PM-RET-002 | `CONFIRMED_DEFECT` | `returns/detail.tsx:53–74, 93–112, 145–230` | Detail fetch failure is replaced with a fully fabricated return record (order, amount, reason, payout method and processing status) and local timeline. This is a source-confirmed false financial/status display. | Honest error/retry/no-data state; authoritative return ID/owner/detail/timeline; payment/refund transaction/notification reconciliation. |
| PM-RET-003 | `STATIC_MATCHED_PARTIAL` | `returns/hub.tsx:69–116, 166–184, 238–315` | Hub loads `/pharmacy/returns` and derives titles, dates, refund labels/timeline and total pending client-side, while embedding a generic cancellation policy. Static source cannot prove list ownership, multi-service scope, status semantics, payout/ledger state or policy consistency. | Authorized returns-list contract, policy/version source, payment ledger settlement and owner/stranger/replay tests. |

## Conclusion

Returns has confirmed fabricated financial/request-data paths and cannot support a refund, policy or payout readiness claim. The source review is complete only for the three listed inventory routes; remediation requires authoritative service-specific contracts and financial-state validation.
