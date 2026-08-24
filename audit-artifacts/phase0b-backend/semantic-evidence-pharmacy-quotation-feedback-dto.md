# Phase 0B semantic evidence — pharmacy-quotation-feedback.dto.ts

**Archive member:** `src/modules/pharmacy/dto/pharmacy-quotation-feedback.dto.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–16; full 16-line member covered.

Lines 2–2 import ProcurementStatus. Lines 4–11 define PharmacyQuotationFeedbackDto with a required status constrained by an enum validator to `APPROVED_BY_PHARMACY` or `CANCELLED`, matching the two pharmacy decisions. Lines 13–16 define an optional string pharmacyFeedback.

**Positive contract:** Status is not an arbitrary ProcurementStatus value; only approval and cancellation are accepted by this DTO. This limits the pharmacy actor from directly requesting admin-review, quotation-issued or completed state through this input.

**Missing controls:** pharmacyFeedback has no maximum length, normalization, content policy or structured cancellation reason. The DTO has no quotation/request identifier, expected version, expiry acknowledgment, currency/amount confirmation, evidence, or idempotency key. It cannot itself prove that the authenticated pharmacy owns the target quotation or that the quotation is still valid and unapproved.

**State/financial implications:** Enum membership is not a transition matrix. Service logic must require QUOTATION_ISSUED as the source state, bind the target request/quotation to the authenticated pharmacy, enforce quotation expiry and one-time acceptance/cancellation, and prevent replay or conflicting decisions. Approval must not be interpreted as payment or inventory commitment without a separate server-authoritative workflow.

**Test implications:** require owner/stranger/unauth/role tests, source-state and terminal-state CAS, expiry, concurrent approve/cancel, replay/idempotency, feedback bounds/content, quotation/request linkage, amount/currency acknowledgment and audit attribution. No tests executed during this semantic read.
