# Multi-country: what it would take, from the code as it is (2026-11-16, lane B)

Docs only. No code, no migration. The lead's inventory (a countries collection, `country_code`, strategy plugins, money as `{ amount_minor, currency }`) was not in the mailbox files I can read, so this is written from the list in the inbox item plus a survey of the repository. Counts below are `grep` counts over `backend/src` without specs; they include seeds and scripts and show the size of the coupling, not the number of bugs. **Nothing here is a product decision or legal advice.**

## 1. Where the product is Saudi-specific today (measured)
| area | what is hard-wired | size | where to look |
|---|---|---|---|
| Currency | the literal `'SAR'` | 81 occurrences in 36 files | `common/quote.ts`, `common/service-offers.ts`, `schemas/transaction.schema.ts`, `schemas/diagnostic-order.schema.ts`, `mcp/mcp.service.ts` |
| Minor unit | amounts are doubles in riyals; integer `*_halalas` shadows next to them (R11 P1 done, P2 reads on main, P3 stops the doubles: `docs/platform/R11-halala-p3-plan.md`) | all money collections | `finance-integrity/halala-backfill.ts` |
| Tax | VAT 15 % default, read from `finance_config tax.vat_percent` (settlement) and a constant `VAT_RATE = 0.15` (invoices) | 31 occurrences in 11 files; the two do not use one source | `billing/billing.module.ts:35`, `common/commission-defaults.ts`, `common/quote.ts` |
| E-invoicing | ZATCA Phase-1 TLV QR, UBL codes 388/381 | `billing/*` | `docs/payments/INVOICE-REVIEW.md` |
| Payments | one gateway seam exists (`PAYMENT_PROVIDER`: stripe, tap, moyasar; hyperpay not built) but it is **one provider per deployment**, not per country | `payments/payment-gateway.ts`; Moyasar named in 30 files | `payments/payments.module.ts`, `moyasar/*` |
| Time | `Asia/Riyadh` for revenue months, sick leave, clocks | 12 occurrences in 7 files | `common/riyadh-clock.ts`, `provider-ops/revenue-by-month.ts` |
| Phone numbers | Saudi mobile format (+966, `05xxxxxxxx`) in login, OTP abuse, checkout contact | 67 occurrences in 15 files | `auth/auth.service.ts`, `common/otp-abuse.service.ts` |
| Health licensing | SCFHS number and registry | 134 occurrences in 24 files | `common/scfhs-license.ts`, `provider/services/scfhs-license.service.ts` |
| Law and data | PDPL, in-Kingdom hosting plan | `docs/platform/R19-data-residency.md` | |
| Language | Arabic first; six locales for the clients; right-to-left layout rules | clients | `AGENTS.md` translation rule |

## 2. A shape that fits what the repository already has
Names follow the inbox item; each is a proposal to review, not a decision.
1. **`countries` collection**, one row per country: `code` (ISO 3166-1 alpha-2), `currency` (ISO 4217), `minor_unit` (2 for SAR, 3 for KWD/BHD/OMR, 0 for none), `timezone`, `default_locale`, `locales[]`, `phone` (country calling code + validation pattern), `tax` (`{ scheme, rate, inclusive }`), `enabled` flag. Read through one cached resolver, like `finance_config`.
2. **`country_code` on the owning records**: patient/user, provider profile and account, facility, order/booking, transaction, invoice. The country of a booking is the provider's, the country of a refund is the payment's. A mismatch (patient in one country, provider in another) is rejected, not converted.
3. **Money as `{ amount_minor, currency }`.** The halala shadows are already this for SAR (integer, minor unit 2). R11 P3 therefore does not need a second migration: the plan is to rename the integer shadow into the money object once the doubles stop being written. **Order matters: finish R11 P3 first, introduce `currency` second.** Float to integer is the hard part and is under way.
4. **Strategy plugins**, one interface per country-dependent concern, resolved by `country_code` (the payment gateway seam is the model to copy; it must become per country, not per deployment):
   - payment gateway (one or more per country; settlement currency)
   - tax and e-invoicing (Saudi: ZATCA; other countries have their own schemes, or none)
   - provider licence registry (Saudi: SCFHS; the daily re-check and `requiresScfhs` become `registry(country).verify(...)`)
   - SMS / OTP provider and the phone rules
   - identity document type (Saudi national ID / Iqama; others differ)
   - data-residency profile (where a country's data may live; see R19)
   - legal texts (terms, privacy, medical disclaimer, per country and per language)
5. **Catalogue**: medicines and services are regulated per country (approval number, registry, price controls). The catalogue needs a country dimension or a separate catalogue per country; one global catalogue with Saudi registration numbers would show wrong data abroad.

## 3. Risks, in order of how much they can hurt
1. **Health data law per country.** Each country has its own regime and may require in-country hosting; R19 is only about the Kingdom. Launching a country can mean another hosting region and another processor list. Counsel decides, per country, before code.
2. **Licensing.** A provider licensed in one country is not licensed in another. Verification, document types and expiry rules (see `docs/platform/LICENCE-EXPIRY-OPTIONS.md`) must be per country.
3. **Money.** Mixed currencies in one ledger, wallet and commission calculations, rounding on 3-decimal currencies, refunds in the original currency. The ledger invariants (`finance-integrity/ledger-invariants.ts`) assume one currency today.
4. **Tax documents.** A credit note or invoice that is valid in one country is not valid in another; the invoice review (`INVOICE-REVIEW.md`) already shows the Saudi rules are not settled with the accountant.
5. **Search, SEO and URLs.** The public pages are keyed by language; a country dimension changes canonical URLs, sitemaps and the nginx bot rule (`WEB-BOT-LIMIT.md`).
6. **Operations.** One 3.8 GB host that is OOM-killed nightly (`R7-memory-decision.md`) is not a base for a second country.

## 4. A staged path (each step is shippable alone and changes nothing for Saudi users)
| step | what | gate |
|---|---|---|
| 0 | finish R11 P3 (stop writing doubles) | owner approval of the P3 plan, 96i numbers at zero |
| 1 | one `currency` source: replace the 81 `'SAR'` literals with a read from the country row, default `SA`; one VAT source for invoices and settlement | tests that all existing amounts and invoices are byte-for-byte the same |
| 2 | `countries` collection with one row (`SA`), `country_code` defaulted to `SA` on every record, no behaviour change | migration dry run first |
| 3 | per-country resolver for gateway, tax scheme, licence registry, phone rules (plugins), Saudi plugins moved behind the interface | per plugin tests |
| 4 | the first other country: needs counsel (health data, licence), the accountant (tax), a local gateway, catalogue source | owner decision, a budget, and R7 (the host) solved |

## 5. Not decided (needs the owner)
Which country is next, and whether it is a product or a legal question first. Whether one deployment serves all countries or one per country (data residency may decide it). Whether currencies mix inside one ledger. Whether providers and patients can cross borders (telemedicine).
