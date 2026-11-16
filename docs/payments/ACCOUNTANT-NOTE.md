# Note for the accountant: invoices, credit notes, QR (2026-11-16, lane B)

Plain-language list of what the system does today and what we need you to decide. Nothing here is advice; it is the behaviour of the code (file names for the developer, not for you). Please answer each numbered point; where a point offers options, tick one. Related: `docs/payments/INVOICE-REVIEW.md` (developer detail), `docs/legal/REVIEW_2026-11-01.md` (the marketplace model).

## How a sale works today
A patient pays the platform by card (or the provider records cash). The platform issues ONE document for the sale and, if a refund goes back to the card, ONE credit note per refund. The platform later pays the provider and keeps a commission.

## What the invoice shows today
- **Amount of VAT (owner decision "Model A", 2026-11-01):** a new tax invoice shows VAT only on the delivery fee the platform charges itself; the service price (consultation, lab test, medicines) carries no VAT line on this document. The commission's VAT is meant for a separate document platform -> provider, which is **not built yet**.
- **Who is named as seller, and whose VAT number is in the QR:** the **platform** (its name and VAT number from our configuration). The legal review says that under Model A the invoice is issued **in the provider's name and VAT number, by the platform as a third party**. So the AMOUNT follows Model A, but the NAME follows the platform.
- If no VAT number is configured, the document is a **payment receipt** (no VAT line, no QR), never a tax invoice.
- QR: ZATCA Phase 1 (seller name, VAT number, time, total, VAT). Phase 2 (clearance/reporting) is **not built**.

## Questions

**1. Seller on the document (most important).** For a service paid through the platform, whose name, VAT number and QR should the document carry?
- (a) the platform (today); then what VAT, if any, applies to the service price?
- (b) the provider, issued by the platform as a third party (what the contract says, clause 5.5/5.6). Needs: each provider's VAT number (or a non-tax receipt path for providers without one) and the third-party billing agreement filed per provider.
- (c) two documents: a service invoice in the provider's name and a platform invoice for the delivery fee and commission.

**2. VAT on healthcare.** Is the medical service itself exempt or zero-rated, and which items are rated (medicines, delivery fee, commission)? The system must put each line in the right class; today it does not classify lines, it only singles out the delivery fee.

**3. Commission invoice.** Platform -> provider, VAT on the commission only: confirm it is required and its content. Not built yet.

**4. Credit note for a card refund.** Today: document type 381, its own number `CN-<year>-<6 digits>`, naming the original invoice, one per refund, partial refunds allowed. The VAT of a partial refund is the same share of the invoice VAT; the last note takes the remainder so the notes add up exactly. Please confirm this is the right document and the right VAT split. **For the QR of a credit note we print positive amounts** (the document itself shows negatives). Do you want positive (today) or negative amounts in the QR?

**5. QR time format.** The time is written like `2026-11-16T09:30:00.000Z` (UTC, with milliseconds). Does the ZATCA validator accept this, or do you want Riyadh time with an offset and no milliseconds?

**6. Numbering.** `INV-<year>-<6 digits>`, `CN-<year>-<6 digits>`, no gaps, restarting each year. Confirm the format and the yearly restart.

**7. Cash sales and refunds.** The provider records cash collected. Who issues the tax document for a cash sale, and is a credit note needed for a cash refund? Today a credit note is issued for card refunds only.

**8. Phase 2.** Is the company (or each provider, if Model A) in a Phase 2 wave, from which date, and is the Phase 1 QR enough until then? Phase 2 means signed XML, a hash chain and a counter; it is a project, not a setting.

**9. Rounding.** Amounts are stored to the halala (2 decimals); credit-note VAT rounds each share and corrects on the last note. Confirm rounding per line or per document.

**10. Keeping documents.** Retention period, and whether Arabic must be the primary language (the PDF is Arabic and English).

## What we will do after your answers
Each answer maps to one small change (seller, QR contents, time format, credit-note QR sign, numbering) with a test. Nothing changes before your reply; no invoice is re-issued; documents already issued keep their stored values (the VAT basis is stored on each document: `delivery_fee` for new ones, `total` for older ones).

## Known gaps (for information)
- A failed invoice write on payment is only logged (a paid booking can stay without a document until someone opens it); a failed credit-note write is now retried by the queue (#2691).
- Two different refunds of one invoice at the same instant could both pass the "not more than the invoice" check.
- Phase 2 and the commission invoice are not built.
