# Invoice / credit note (381) / ZATCA: review pass (2026-11-16, lane B)

Scope: read of `backend/src/modules/billing/billing.module.ts`, `invoice-pdf.ts`, the specs, and `docs/payments/INVOICES.md`. Nothing here is a legal opinion: section 3 lists what the accountant (or the ZATCA validator) must confirm.

## 1. What the code does (checked in code, with tests)
| rule | where | test |
|---|---|---|
| Invoice only for a paid booking, total = what was charged; VAT taken out of the total at `finance_config tax.vat_percent` (default 15) | `billing.module.ts` (`VAT_RATE` line 35, issue ~445-500) | `billing-invoice-api.spec.ts` |
| Tax invoice vs payment receipt is derived from config: no seller VAT number means a receipt with no VAT (never a "tax invoice" without a VAT number) | `documentKindOf`, owner decision 2026-11-01 in `INVOICES.md` | `billing-receipt.spec.ts` |
| Phase-1 QR: TLV tags 1-5 (seller, VAT no., timestamp, total, VAT), base64, length byte = UTF-8 byte length, each value max 255 bytes (throws above) | `tlvQr` lines 93-106 | `tests/billing-zatca.spec.ts` |
| Credit note: `type 'credit_note'`, `document_type_code '381'` (invoice '388'), `original_invoice_no`, number `CN-<year>-<seq>`, one per refund (`refund_ref` unique), VAT = the refund's share of the invoice VAT, the last note takes the VAT left so the notes add up to the invoice VAT to the halala; total of notes can never exceed the invoice | `issueCreditNote` lines 529-577 | `billing-invoice-api.spec.ts` (full, partial, two partials) |
| Credit note QR carries the absolute amounts, timestamp = time of the note | line 567 | same |
| Numbers have no gap: the sequence is taken only after the insert won | `insertNumbered` line 171 | `billing-invoice-api.spec.ts` |

## 2. Gaps found
1. **A credit note could be lost silently (fixed in this PR).** `issueCreditNote` caught every error and returned null. The refund event is delivered by the durable queue, which retries only when the listener throws; a returned null marks the delivery done. A database error at that moment (mongod was being OOM-killed several times a night) left a refund without its credit note and nothing retried. Now a delivery from the durable queue (`__durable` stamp) throws, so it is retried with backoff and ends `dead` (visible on the health page) after the maximum attempts; a direct call still only logs. `refund_ref` is unique, so a retry cannot issue two notes. Test added. **Same pattern not fixed:** the invoice issue on `payment.completed` ("a failed issue never fails the payment, it is logged"): a failed issue is only logged and not retried, so a paid booking can stay without an invoice. `GET /billing/invoice/:kind/:bookingId` issues a missing invoice when someone opens it (`billing.module.ts:788-790`), so it appears when the patient opens the receipt; a booking nobody opens stays without one. I have not measured how many bookings have none.
2. **Credit notes are issued for card refunds only** (`payment.refund.card`). A cash refund or any other refund path issues none. Whether another refund path exists must be answered with the money owner (the product has no wallet refund by decision).
3. **Concurrent partial refunds**: the cap (`remaining`) is read, then the note inserted; two different refunds of the same invoice at the same instant could each pass the check. The unique `refund_ref` stops duplicates of the same refund, not two different ones. Low probability, not closed.
4. **Floats**: amounts are doubles rounded with `Math.round(x*100)/100` (the R11 halala migration, `docs/platform/R11-wallet-balances-plan.md`, does not cover the invoice collection).
5. **One invoice per booking** (corrected 2026-11-16): a partial unique index on `einvoices (booking_kind, booking_id)` is built by `invoice-key.ts` `ensureInvoiceUniqueIndex` at the first issue; it is NOT built, and a warning is logged, when existing duplicates are found (finance must resolve them first). The earlier text of this line (no unique index) came from `INVOICES.md` and was out of date.
6. **Phase 2 (clearance/reporting, signed XML, hash chain, ICV)** is not built. Only the QR of Phase 1 exists. The document type codes (388/381) are stored, but no UBL XML is produced.

## 3. What the accountant must confirm (we cannot decide these)
1. **Which entity is the seller, and on what is VAT charged?** (corrected 2026-11-16, see `ACCOUNTANT-NOTE.md`). The code follows the owner's Model A for the AMOUNT (new tax invoices carry only the VAT inside the delivery fee, `vat_basis: 'delivery_fee'`; older ones took VAT from the whole total, `'total'`), but the seller name and VAT number on the document and in the QR are still the platform's (`seller()` reads the platform config). `docs/legal/REVIEW_2026-11-01.md` section 5 says that under Model A the issuer is the provider. The earlier text of this line (the whole price is VAT-inclusive) was out of date.
2. **Who is the seller on the document**: the platform or the provider? Marketplace invoicing (platform issues in the provider's name, or invoices only its own commission) changes the seller, the VAT number and the QR.
3. **VAT registration and the numbers**: legal name, VAT number, CR number, address (the fields exist in `finance_config invoice` / `ZATCA_*`; in production no VAT number means no tax invoice).
4. **Phase 2**: is the company in a Phase 2 wave, from which date, and does a simplified (B2C) invoice have to be reported within a period? Is the current Phase 1 QR enough for now?
5. **QR timestamp format**: tag 3 is an ISO 8601 string with milliseconds and `Z` (e.g. `2026-07-24T10:00:00.000Z`). Does the ZATCA validator accept it as is, or does it want seconds only or the KSA local offset? (Cheap to change in `tlvQr`; test with the official validator or app.)
6. **Credit notes**: confirm that for a refund of a simplified invoice a credit note with document type 381 that references the original invoice number is the right document, that the QR of a credit note shows absolute amounts (as built) or signed ones, and that a partial refund's VAT share (proportional, last note takes the remainder) is acceptable.
7. **Invoice numbering**: `INV-<year>-<6 digits>` and `CN-<year>-<6 digits>`, no gaps. Confirm the format and that restarting the sequence each year is accepted.
8. **Retention and language**: how long invoices must be kept and whether Arabic must be the primary language (the PDF is Arabic and English, see `INVOICES.md`).
9. **Cash**: the provider records cash collected; who issues the tax document for cash, and is a credit note needed for a cash refund?

## 4. What I did not do
No PDF layout review (needs the Arabic font and a human), no Phase 2 design, no change to VAT logic (accountant first).
