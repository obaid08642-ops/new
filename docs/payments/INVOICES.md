# Invoices and receipts (session F, 2026-10-31)

## What changed (this PR, backend)
- An invoice is issued only for a **paid** booking and its total is **what was charged** (settled card payments, else the cash the provider recorded as collected). Before, any booking could be invoiced at its price, so an insured booking was invoiced at the full price although the patient paid the co-pay, and an unpaid booking got an invoice.
- VAT is taken out of the total at the rate in `finance_config` (`tax.vat_percent`, default 15), the same setting the provider settlement uses, instead of a fixed 15%.
- Governed pharmacy orders (`pharmacy_orders`) can be invoiced; before, only the legacy `orders` collection was read.
- The invoice is issued at once on `payment.completed`, so it exists when the patient opens the receipt. A failed issue never fails the payment (it is logged).

## Receipt data and credit notes (this PR)
The invoice document, and so the API response, now carries: `invoice_no`, `lines` (items, or consultation / platform / home-visit / transport / delivery fee lines, plus one `adjustment` line if they do not add up to the price), `payment` (`method`, `last4` only), `insured` (`insurer`, `price`, `covered`, `copay`) when an insurer paid part, `seller_name`, `vat_number`, `issued_at`, `qr` (`{ format: 'zatca-phase1-tlv-base64', payload }`, also `qr_base64`) and `pdf_url`. The QR is TLV tags 1 to 5: seller, VAT number, `issued_at` as ISO, total incl. VAT, VAT. The PDF (`GET /billing/documents/:invoiceNo/pdf`, also `invoice/:kind/:id/pdf`) is drawn from the stored document and encodes the same payload.

Seller name and VAT number: `finance_config` document `{ key: 'invoice', seller_name, vat_number }`, else `ZATCA_SELLER_NAME` / `ZATCA_VAT_NUMBER`. In production no VAT number means no invoice is issued.

A credit note (`type: 'credit_note'`, number `CN-<year>-<seq>`, `original_invoice_no`) is a negative invoice issued for every card refund (event `payment.refund.card` from `refundTransactionAsSystem`, which every card refund passes), one per refund (`refund_ref`), capped at the invoice total, with its own QR carrying the negative total and VAT. Not covered: cash refunds (no card payment, no gateway refund) and the legacy `moyasar_payments` refund in `moyasar.module.ts`; neither issues a credit note. How a credit note's QR must encode negative amounts is my reading of "negative invoice"; confirm with the accountant before go-live.

## What each person sees today
- **Patient:** endpoints exist (`GET /billing/my`, `GET /billing/invoice/:kind/:id`, `.../pdf`, `POST .../email`), but **no client calls them**: patient-app, patient-web, provider-app and admin have no invoice or receipt screen. The patient sees the amount on the payment result screen only. Needs a screen (booking detail and payment success: "Download receipt") with six translations.
- **Provider:** the wallet shows ledger lines labelled commission and VAT (`provider-app/src/utils/ledgerLabels.ts`) and the commission rates; there is no per-booking statement. The provider-facing document is a statement, not the patient's tax invoice.
- **Admin:** `GET /billing/admin/list` exists; no admin screen reads it (not verified beyond a search of `admin/src`).

## Open (owner / next PR)
- **VAT position (G7 of `docs/qa/money-flows.md`).** The invoice treats the whole price as VAT-inclusive; the provider settlement takes VAT on the commission only. The accountant must say which is right (a licensed healthcare provider's own service may be exempt, and the platform's VAT would then be on its commission only).
- **One invoice per booking.** A booking with two settled payments gets one invoice for the sum; there is no unique index on (kind, booking), so two simultaneous issues can create two. The loser of an insert error re-reads the winner, but a true race is not closed by a database constraint.
- **ZATCA Phase 2** (clearance, signing) is not built; `ZATCA_VAT_NUMBER` and `ZATCA_SELLER_NAME` must be set in production.
- **PDF** is English plus an Arabic title; the layout is the Phase-1 simplified invoice. Arabic item names depend on the PDF font; not checked.
