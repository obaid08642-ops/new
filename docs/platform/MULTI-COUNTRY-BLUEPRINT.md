# Multi-country blueprint (lane M, Phase 1 output, 2026-11-17)

Status: **proposal for lead approval. No code until approved.** Inputs: `docs/platform/mc-audit/*` (evidence), `docs/platform/MULTI-COUNTRY.md`, `lead/MULTI_COUNTRY_PLAN.md`, `lead/MULTI_COUNTRY_RESEARCH_2026-11-17.md`, owner decisions 2026-11-17 (local partners operate each market under the Nabd brand; SA + EG first, side by side; any country = configuration + data, not code). EG facts are **[unverified]** until counsel/accountant confirm.

## 1. Goals and non-goals
Goals: one platform (one backend, apps, web, admin, API contract); markets as data; Saudi behaviour byte-identical after every step; no hidden Saudi constant (proved by a test market with a 3-decimal currency).
Non-goals now: microservices, a second deployment, cross-border consultations (denied by default), new SMS gateway (SMS stays off, owner 2026-10-25), SCFHS API.

## 2. Target model
```
Country (ISO 3166-1)  --has-->  Jurisdictions (SA, EG, AE-DU, ... sub-national allowed)
Market  = a sellable area: { id, country, status Draft..Live..Suspended, operator_id, data_plane, config_version }
Operator = legal entity (local partner): { legal name, tax ids, bank, invoice identity, contracts, brand permissions }
MarketConfig = typed, versioned, effective-dated JSON (schema-validated), audited
Provider -> licences per jurisdiction; Catalogue = global concept + market registration
```
- Country != market != operator != data region. One operator may run several markets; one market has one operator at a time (history kept).
- **MarketContext** `{market_id, country, operator_id, currency, timezone, locale, config_version, data_plane}` resolved by the SERVER per request: account market (for patients), provider/order market (for those records), then an explicit selected market validated against what the account may use; a client hint is never trusted. Attached via Nest guard + AsyncLocalStorage (the structured logger already uses `runWithLogContext`, `common/structured-logger`).
- **Guard:** repositories for market-scoped collections refuse a query without `market_id` (explicit all-markets scope only for global admins, audited).

## 3. Typed versioned config (not a key-value table)
`market_configs { market_id, version, effective_from, status, config, created_by }`, immutable rows, one active per `effective_from`. Sections (each with a TypeScript type + JSON schema + defaults):
`currency {code, exponent, symbol per locale}`, `tax {scheme, rate, inclusive, rounding, registration}`, `timezone`, `calendar {weekend, week_start}`, `locales {default, enabled}`, `phone {default_dial, patterns, otp_channels, allowed_countries}`, `address {template_id}`, `identity {patient_doc_types, provider_doc_types}`, `emergency_numbers`, `payments {gateways, methods, settlement_currency}`, `invoicing {scheme, numbering}`, `refunds`, `licences {types, expiry_rules}`, `legal {document_ids}`, `branding {name, logo, colours?, domain, support}`, `features`, `data_plane`.
Orders/invoices store `config_version` + the resolved values they used (snapshot). The existing `finance_config`, `system_configs`, `feature_flags` remain for platform ops; market-varying values move into MarketConfig behind one reader (step 3).

## 4. Plugins per market (interface + registry by `market_id`)
payment gateway (`payments/payment-gateway.ts` seam, made per market, webhooks routed by gateway), tax + e-invoice (ZATCA becomes the SA plugin), phone/OTP (`auth/auth.service.ts:423-441` -> libphonenumber), identity document (national ID/Iqama regex+mask), address verification (Saudi short address -> optional plugin), licence verification (SCFHS inert; default = admin document review), geocoder/maps, SMS (off), legal-text renderer, AI provider policy. Rule: a plugin is selected by config; adding a market never edits plugin callers.

## 5. Money
`{ amount_minor: int, currency: ISO 4217 }`, exponent from a table (SAR/EGP 2, BHD/KWD/OMR 3, JPY 0). Per-currency ledgers and wallets; invoice, payment and settlement are separate documents; refunds in the original currency; no FX in v1 (a market = one currency). Prerequisite: R11 P3 (stop writing doubles) first; the halala shadows become `amount_minor` with `currency:'SAR'` backfilled. Existing response fields stay for SA until clients move.

## 6. Catalogue and providers
Catalogue: `concept` + `registration(concept_id, market_id, local_code, status, price_rule, effective)`; provider offerings carry market + currency (`catalogues.md`). Providers: organization -> legal entity -> branch -> offering; `licences[] {jurisdiction, type, number, issuer, expiry, document_ids, verified_by, status}` replaces `scfhs_license_number`/`moh_license_number`; onboarding form schema per (market, provider type) delivered by API; expiry evaluated in the licence jurisdiction's timezone (LICENCE-EXPIRY-OPTIONS A2/B2/C2/D2 stay the rules).

## 7. Address, branding, legal
Address templates (fields, order, required, validation, labels per locale) per market; Saudi short address becomes an optional verification field; `locations` tree gets a country root per market (`location.schema.ts:6,44`). Branding per market via config: name, logo, domain, support contacts, store listing; the Nabd Dot logo identity stays (AGENTS.md identity rule): partner name appears as operator, not as a new logo variant, unless the owner approves. Legal documents are versioned rows (market, locale, type, version, effective_from), acceptance stored per version.

## 8. Data planes
Global control plane (no health data): markets, configs, directory `hash(phone)->{home_market, cell}`, global reference. One cell per residency jurisdiction (Mongo, Redis, queues, buckets, LiveKit/TURN, logs). Day one: SA cell = today's deployment (R19 moves it in-Kingdom); EG shares the SA cell only if counsel confirms the transfer route, otherwise a second cell from the same template. Events/queues/keys/files carry `market_id` + `region`. Indexes start with `market_id`, so a split or zone sharding is cheap later.

## 9. Migration keeping SA byte-identical
1. Add `markets` with one row `SA`, `operator` row for the current company, `market_configs` v1 holding today's values.
2. Backfill `market_id='SA'` (+ `operator_id`, `currency:'SAR'`) on every market-scoped row, dry run + backup first (same discipline as the halala backfill).
3. Replace each constant with a MarketConfig read that returns the same value; golden tests compare invoice PDFs, quotes, notifications and reports before/after (byte/JSON equality).
4. Only then add EG rows. No SA code path is removed until the generic path passes the same goldens.

## 10. Tests
Golden snapshots for SA (quote, invoice, refund, revenue month, OTP canonicalisation); contract tests per plugin interface; guard test (query without market refused); isolation test (EG admin cannot read SA records); money property tests (exponent 0/2/3, rounding); `residency-inventory.spec.ts` per cell; lint rule banning `'SAR'`, `+966`, `Asia/Riyadh`, `ZATCA` outside the SA plugin/config (ratchet baseline, like `no-literal-ui-string`); the internal test market (BH/KW 3-decimal, never launched) runs the full journey suite.

## 11. Phased steps (PR sizes: S <200 LOC, M <600, L >600)
| step | content | PRs |
|---|---|---|
| 0 | finish R11 P3; dedupe duplicate schemas (`data-classification.md` Findings) | 2 M |
| 1 | `markets`, `operators`, `market_configs` + types + reader; one SA row; golden tests | 3 M |
| 2 | one source for currency/VAT/timezone/weekend/emergency; delete the literals behind the reader; lint ratchet | 6 M (by area: billing, quotes, finance, provider-ops, clock, clients) |
| 3 | `market_id`/`operator_id` backfill + indexes + MarketContext + guard | 4 M |
| 4 | identity/phone/address/OTP plugins; clients read phone/address/ID config | 4 M + 2 L (apps) |
| 5 | licences per jurisdiction, onboarding schema per market x type, admin expiry list | 4 M |
| 6 | catalogue concept + registration split, import tooling | 4 M |
| 7 | money object + per-currency ledger + tax/e-invoice plugin (after step 0) | 5 M + 1 L |
| 8 | payment plugin per market, webhook routing | 3 M |
| 9 | apps/web/admin market-aware: switcher, branding, legal, SEO per market, store listing | 6 M + 2 L |
| 10 | data plane: cell template, directory, SA in-Kingdom (R19), per-cell inventory | 4 M + 1 L |
| 11 | internal 3-decimal test market proves no Saudi leftovers | 2 M |
| 12 | EG pilot: config + data + licences + gateway + counsel/accountant sign-off | data PRs + ops |
Roughly 50 PRs; Saudi users see no change until step 12 (steps 1-11 are invisible by construction).

## 12. Risks and open questions for the lead/owner
1. Health-data law per market (EG PDPC licence for transfers [unverified], SA SDAIA draft [pending]): decides one vs two cells. 2. Operator legal entity per market: who issues invoices and holds the gateway account. 3. Brand: logo/name per market vs AGENTS.md identity rule. 4. Currency mixing: assumed no (one currency per market). 5. Patient travelling to another market: assumed read-only access to own records, booking only in the active market. 6. Duplicate schema definitions must be resolved first. 7. EG facts in this repo are unverified; accountant/counsel needed for tax (VAT, e-invoice) and licences. 8. R7 (single 3.8 GB host) blocks a second live market.
