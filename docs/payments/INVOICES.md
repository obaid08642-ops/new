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

## Receipt API: what `GET /billing/invoice/:kind/:id` returns (invoice and receipt backend gaps)
Every figure is stored from the payment and the booking when the invoice is issued. The client only displays it.

| Field | Meaning |
| --- | --- |
| `invoice_no`, `type` (`invoice` \| `credit_note`), `issued_at`, `currency` | identity and time of issue |
| `lines[]` `{ key, name_ar, name_en, qty, unit_price, amount }` | the service lines (items, or consultation / platform / home-visit / transport / delivery fee lines; one `adjustment` line only if the lines do not add up to the price) |
| `discount` | what was taken off (coupon, points); `lines` add up to the price before it, `total` is after it |
| `document_kind` (`tax_invoice` \| `receipt`), `title { ar, en }` | which document this is, fixed when it was issued |
| `subtotal`, `vat_rate`, `vat_amount`, `total` | tax invoice: `subtotal + vat_amount = total`, VAT inside the total. **Receipt: `vat_rate` and `vat_amount` are `null`, `subtotal = total` = the amount paid** |
| `payment` `{ method, last4 }` | from the gateway record; `last4` is never more than the last 4 digits (null for cash) |
| `insured` `{ insurer, price, insurer_share, patient_share }` or `null` | when an insurer paid part; `total` is then the patient's share |
| `seller` `{ legal_name, vat_number, configured }` | from `finance_config` (`invoice`: `seller_name`, `vat_number`) or `ZATCA_SELLER_NAME` / `ZATCA_VAT_NUMBER`. Never invented. `configured` is `true` only on a tax invoice (name and VAT number both set when it was issued); a receipt has `vat_number: null`, `configured: false`. A receipt is **not** sealed later (see "Tax invoice or payment receipt"). |
| `qr` `{ format, payload }` or `null` | tax invoice only (`null` on a receipt): ZATCA phase-1 TLV, base64: seller, VAT number, `issued_at`, `total`, `vat_amount` (same figures as above) |
| `state` (`paid` \| `partially_refunded` \| `refunded`; `credit_note` on a credit note), `refunded_total`, `credit_notes[]` `{ invoice_no, total, vat_amount, issued_at }` | the refund state, derived from the credit notes that reverse the invoice |
| `pdf_url` | `GET /billing/documents/:invoiceNo/pdf`, drawn from the same stored document |

`GET /billing/my` and `GET /billing/admin/list` return the same shape per row (one credit-note query for the whole list).

## Owner content and sharing (PDF and share link)

### The PDF, top to bottom (Arabic on the right, English on the left of every line)
Title "فاتورة ضريبية مبسطة / Simplified tax invoice" (a credit note: "إشعار دائن / Credit note") with the logo and the ZATCA QR; **Issued by** (our company: legal name, VAT number, CR number, address); **Invoice details** (number, issue date and time, booking / order number, optional customer name, state and credit notes); **Service provider** (name, type, licence number if we hold one; labelled as the party that delivered the service, our company stays the issuer); **Items** (name Arabic and English, qty, unit price, amount); discount, subtotal, VAT and rate, total; **Payment** (method and last 4, the insurance shares); footer on every page (support contact, refund-policy link, "electronically generated").

Arabic is shaped by fontkit from the embedded Noto Naskh Arabic font; lines that mix Arabic with numbers or English are ordered by `common/pdf-bidi.ts` (Arabic words, brackets mirrored, numbers kept whole, Latin and digits in Helvetica, which has the glyphs Naskh lacks). Checked by rendering the PDF to an image and reading it, not only by tests. The logo is the existing app icon (`assets/brand/nabd-icon.png`, the Noon Dot on the brand colour); no new variant. Names in Devanagari (Hindi) or Bengali script are not drawn correctly: neither embedded font has their glyphs, so a patient name in those scripts shows as missing characters (the name is optional on a simplified invoice). Urdu names in Arabic script depend on the Naskh font's coverage of the Urdu letters; not checked.

### Company fields: `finance_config` document `{ key: 'invoice' }`
`seller_name`, `vat_number`, `cr_number`, `address`, `support_email`, `support_phone`; the environment names `ZATCA_SELLER_NAME`, `ZATCA_VAT_NUMBER`, `ZATCA_CR_NUMBER`, `ZATCA_SELLER_ADDRESS`, `INVOICE_SUPPORT_EMAIL`, `INVOICE_SUPPORT_PHONE` are used when the document has no value. Empty means "not configured": the PDF and the API say so (`null`), nothing is invented. Legal name and VAT number are needed for the QR; CR number and address are shown when set. The refund-policy link is `NABD_PUBLIC_URL` (default https://nabd.plus) + `/ar/refund-policy` or `/en/refund-policy`.

### New fields on the invoice API
`seller.cr_number`, `seller.address`; `provider` `{ name_ar, name_en, facility_name, type, license_number }` (a snapshot taken at issue from the provider's profile, nothing else of the profile); `patient_name` (optional, only when the booking carries one); `booking_ref` (tracking id, else the first 8 characters of the booking id); `footer` `{ support_email, support_phone, refund_policy_url: { ar, en } }`.

### Share link
| Endpoint | What |
| --- | --- |
| `POST /billing/invoice/:kind/:id/share-link` body `{ expires_in_days?: 1..30 }` (default 7) | owner only; returns `{ id, token, url, page_url, path, pdf_path, expires_at }`. The token is 32 random bytes, shown once; only its SHA-256 is stored. `url` opens the PDF, `page_url` the JSON of the same invoice (both need `API_BASE_URL`; without it they are `null` and the paths are given). Rate limited: 5 requests a minute, 10 links an hour per patient, 20 live links per invoice (429). |
| `GET /billing/invoice/:kind/:id/share-links` | the owner's links with status (`active`, `expired`, `revoked`), view count, last view; never a token |
| `DELETE /billing/invoice/:kind/:id/share-links/:linkId` | revoke; repeating it changes nothing |
| `GET /billing/shared/:token` and `/pdf` (no login) | read-only. An unknown, expired or revoked token answers the same 404. Shows the invoice and no other account data: no patient id, no patient name, no internal booking id. `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`. Every view is logged in `invoice_share_views` (time, link, page or PDF, a hash of the address, the browser string). 30 requests a minute per address. |

`POST /billing/invoice/:kind/:id/email` is unchanged.

### Not changed
The VAT position (G7 of `docs/qa/money-flows.md`): whether VAT is due on the whole price or only on the commission (exempt healthcare) still needs the accountant. Prices stay VAT-inclusive and the invoice shows the VAT inside the total, as before.

## Tax invoice or payment receipt (owner decision, 2026-11-01)

The seller is "منصة نبض الطبية". Its CR number, VAT number and address are not issued yet, and a platform that is not VAT-registered must not call a document a tax invoice or show VAT it does not collect. **One switch, derived from config** (`common/tax-registration.ts`): a legal seller name **and** a VAT number in `finance_config` `{ key: 'invoice' }` (or `ZATCA_SELLER_NAME` / `ZATCA_VAT_NUMBER`) = tax invoice; otherwise = payment receipt.

| | Tax invoice (VAT number set) | Payment receipt (no VAT number) |
| --- | --- | --- |
| Title | فاتورة ضريبية مبسطة / Simplified tax invoice | إيصال دفع / Payment receipt |
| Number | `INV-<year>-<n>` | `RCT-<year>-<n>` (own series) |
| VAT line and rate, subtotal | yes (VAT inside the total) | none: `vat_rate` and `vat_amount` are `null`, `subtotal = total` |
| ZATCA QR | yes | none |
| Total | amount paid, incl. VAT | `Total paid / المبلغ المدفوع` = the amount paid |
| VAT number, CR, address on the PDF | shown (or "not configured") | VAT number never printed; CR and address only when issued |
| Refund | credit note `CN-<year>-<n>`, negative VAT and QR | refund receipt `RRC-<year>-<n>` (إيصال استرداد / Refund receipt), no VAT, no QR |
| E-mail | "الضريبة (15%)" line | amount paid only |
| Quote (`/bookings/quote`, lab/radiology rows) | `vat_rate`, `vat`, `subtotal`, `tax_registered: true` | `vat_rate` and `vat` `null`, `subtotal = total`, `tax_registered: false` |

- **Never re-labelled.** The kind is stored on the document when it is issued (`document_kind`). When a VAT number is set later, documents issued from then on are tax invoices; receipts already issued stay receipts (no VAT, no QR is added). A receipt only picks up the legal name, CR number and address if they are issued after it. Documents from before this field existed: sealed with seller + VAT number = tax invoice, otherwise receipt.
- **Prices and charges are unchanged.** Only what is shown and which document is issued depends on the switch. The VAT position (G7: whole price or commission only, exempt healthcare) is **not** changed; the settlement still takes VAT on the commission only.
- **Provider agreement §5.4** says the provider issues the service invoice, while this document names the platform as issuer. S is reviewing the agreement; the code stays as is until the owner and the accountant decide.
- Clients: the receipt screens (app and web) read `document_kind`; a receipt is drawn titled "Payment receipt" with "Total paid", no VAT rows and no QR (keys `receipt.paymentReceipt`, `receipt.totalPaid`, six languages). Design: the fields are `document_kind`, `title`, nullable `vat_rate` / `vat_amount`, `qr: null`, and on quotes `tax_registered`.


## VAT model A: where platform VAT applies (owner decision, 2026-11-01), the exact rule

The **provider is the supplier of the service**. The platform issues the patient's document as a **third party**. Therefore:

1. **The patient document shows the provider as the seller of the service** (`provider`: name, type, licence number; PDF section "Service provider (seller of the service)"). The platform (`seller`) is the issuer, as a third party, and says so on the PDF.
2. **Platform VAT applies only to two things:**
   - **its commission**: on the platform → provider commission invoice (the settlement: `VAT = commission x vat_percent`; the provider statement shows "VAT on commission"). Never on the service price.
   - **the delivery fee** (the `delivery_fee` line), a line the platform charges. It is VAT-inclusive: `VAT = fee - fee / (1 + rate)`, never more than what was paid.
3. **The service price itself carries no platform VAT.** A document or quote with no delivery-fee line has `vat_amount` / `vat` = 0 (tax invoice) and `subtotal = total`.
4. **No platform VAT number = no VAT lines at all** (receipt mode, above), even with a delivery fee.
5. The rate is `finance_config` `commissions.tax.vat_percent` (default 15).

| Where | Model A |
| --- | --- |
| Invoice / receipt (`billing.module.ts`) | `vat_amount` = VAT inside the delivery fee; `vat_basis: 'delivery_fee'`; `subtotal = total - vat_amount`; the QR carries the same figure (tag 5). Receipts: unchanged (null VAT). |
| Credit note | its share of the original's `vat_amount`: `-(vat_amount x refund / total)` |
| Documents issued before this change | keep the VAT they were issued with; the API says `vat_basis: 'total'` |
| Quote (`common/quote.ts`, `GET /bookings/quote`, lab/radiology rows) | `vat` = VAT inside a `delivery_fee` line, else 0; `null` while unregistered |
| Settlement (`provider-ops.creditEarning`, pharmacy allocation) and provider statement | VAT on the commission only (unchanged; now pinned by `vat-model-a.spec.ts`) |
| PDF | VAT line "VAT on the delivery fee 15%"; provider labelled the seller of the service; issuer note says "third party" |
| App and web receipt screens | the subtotal and VAT rows show only when the document has platform VAT (> 0) |

**Found, not changed (they would change what a patient is charged; owner to confirm):**
- `modules/unified-bookings/booking-ops.module.ts` `invoice()` (the derived booking invoice) and `modules/business-rules/business-rules.module.ts` `computePricing` (`taxRate = 0.15`) and `modules/ai-commerce/ai-commerce.service.ts` (checkout adds VAT on top of the subtotal) still add VAT to the service price.
- `platform_fee` (consultation service fee), `home_visit_fee` and `transport_fee` are platform-charged lines (the settlement leaves them out of the provider's credit) but are neither commission nor delivery fee, so by the rule above they carry no VAT. If they should, say so.
- Pharmacy `providerOwnAmount` counts the whole order total (delivery fee included) as the provider's gross, so commission and the provider credit include the delivery fee. If the platform keeps the delivery fee, the settlement must leave it out.
- A tax invoice for the service itself (the supplier's invoice) needs the provider's VAT number; this document only carries the platform's VAT on its delivery fee (provider agreement §5.4, S is reviewing it).
