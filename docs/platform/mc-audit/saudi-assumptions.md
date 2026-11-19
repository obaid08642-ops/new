# Saudi assumptions inventory (Phase 1, read-only)

Evidence: `file:line` from `grep` on branch `main` (2026-11-17). Counts are matches over source without specs/tests/locale files; they show coupling size. EG column = what Egypt needs; **[unverified]** = from background knowledge, counsel/accountant must confirm before code depends on it (see `lead/MULTI_COUNTRY_RESEARCH_2026-11-17.md`). "Becomes" = which layer owns it after the foundation: **MarketConfig** (typed, versioned), **Plugin** (per-market implementation), **Data** (rows), **Branding**, **Operator**.

## A. Backend (`backend/src`)
| # | Assumption | SA evidence | EG needs | Becomes |
|---|---|---|---|---|
| 1 | Currency literal `'SAR'` (183 matches) | `modules/provider/schemas/capabilities.schema.ts:28`, `provider/schemas/requests.schema.ts:74`, `billing/billing.module.ts:49` (schema defaults); `radiology/radiology.service.ts:632`, `labs/labs.service.ts:213`, `provider-ops/provider-ops.module.ts:572`, `provider-ops/revenue-by-month.ts:63`, `provider/services/provider-dashboard.service.ts:61` (responses); `payments/payments.module.ts:114` (gateway body); `ai-commerce/ai-commerce.service.ts:95`, `events/auto-entity-seo-pipeline.service.ts:314` (SEO/schema.org) | EGP, 2 decimals | MarketConfig `currency` + money `{amount_minor,currency}` |
| 2 | Minor unit = halala (100); doubles + `*_halalas` side by side | `schemas/wallet.schema.ts:8,36`, `finance-integrity/halala-backfill.ts`, `docs/platform/R11-halala-p3-plan.md` | piastre (100); BHD/KWD need 1000 (test market) | money model, ISO 4217 exponent table |
| 3 | VAT 15 % in two separate sources | `billing/billing.module.ts:35` (`VAT_RATE = 0.15`); `common/commission-defaults.ts:4,25` (`DEFAULT_VAT_PERCENT`, `finance_config tax.vat_percent`); `modules/config/config.service.ts:90`; `provider-ops/provider-ops.module.ts:752`; `finance-engine/finance-engine.module.ts:61` | VAT 14 % [unverified]; different invoice rules | MarketConfig `tax` + tax plugin; one source |
| 4 | ZATCA Phase-1 e-invoice, TLV QR, UBL 388/381, "ZATCA" text on PDF | `billing/billing.module.ts:2`, `billing/invoice-pdf.ts:66`, `common/tax-registration.ts:5,29` (`ZATCA_VAT_NUMBER`, `ZATCA_CR_NUMBER`), `security/audit-retention.service.ts:31` (6-year tax retention) | Egyptian Tax Authority e-invoice/e-receipt [unverified] | tax/e-invoice plugin; retention per jurisdiction |
| 5 | Payment gateway one-per-deployment; Moyasar default (239 matches) | `payments/payment-gateway.ts:5`, `payments/payments.module.ts:64,146,238,361`, `finance-engine/finance-engine.module.ts:737`, `moyasar/moyasar.module.ts:44` (collection `moyasar_payments`) | local gateway (e.g. Paymob/Fawry) [unverified] | payment plugin per market; generic `payment_attempts` |
| 6 | mada / Saudi card brands | 14 matches in backend (`grep -rn mada`) | Meeza / cards [unverified] | payment plugin capabilities |
| 7 | Time zone `Asia/Riyadh`, UTC+3 no DST (13) | `common/riyadh-clock.ts:5,9`, `modules/mail/mail.module.ts:63`, `modules/auth/auth.service.ts:1139,1170`, `provider-ops/revenue-by-month.ts:10`, `sick-leave/sick-leave-pdf.ts:63`, used by `finance-engine`, `loyalty`, `billing`, `pharmacy/price-review.ts:3`, `nutrition` | Africa/Cairo (DST since 2023 [unverified]) | MarketConfig `timezone`; clock per market |
| 8 | Weekend / week model (Fri) and default working days Sat-Thu | `provider/providers.service.ts:381`, `home-care/home-care.service.ts:323`, `radiology/radiology.service.ts:1028` | Fri-Sat weekend [unverified] | MarketConfig `weekend`, `week_start` |
| 9 | Phone: `05…`, `+966`, 9-digit | `auth/auth.service.ts:423-441` (canonical form), `auth/checkout-contact.service.ts:4`, `common/otp-abuse.service.ts:47`, `emergency/emergency.service.ts:11`, `provider/services/provider-profile.service.ts:127` (default `+966`) | +20, 01x + 8 digits [unverified] | phone plugin (libphonenumber), E.164 stored |
| 10 | OTP delivery: **no SMS** by owner decision 2026-10-25 (push/email only); "SMS pumping" country allow-list exists | `auth/auth.service.ts:82,459,541,667` | same decision stands; Egypt users may lack push before first login | OTP plugin per market (email/push now, SMS plugin later); allow-list in MarketConfig |
| 11 | National address (short address, SPL) | `users/users.addresses.controller.ts:7,13,22-28`, `common/national-address`, `users/national-address.service.ts`, `common/national-address.ts` | governorate / district / street / building; no national short code [unverified] | address template per market |
| 12 | National ID / Iqama (10 digits, checked), encrypted | `sick-leave/sick-leave.dto.ts:20`, `sick-leave/sick-leave-rules.ts:69`, `common/patient-national-id.ts:2`, `sick-leave/sick-leave-pdf.ts:40` ("ID / iqama no.") | national ID 14 digits [unverified] | identity-document plugin (type, regex, mask) |
| 13 | SCFHS licence (138 matches); `requiresScfhs`; re-check code inert (owner 2026-11-17: no integration) | `common/scfhs-license.ts:2`, `provider/services/scfhs-license.service.ts:5,17,23`; field `scfhs_license_number` | Egyptian Medical Syndicate / MoH licences, nurses' syndicate, pharmacists' syndicate [unverified] | licence type registry per jurisdiction; verification = admin review (no API) |
| 14 | Provider onboarding fields CR, MoH licence | `provider-onboarding/provider-onboarding.dto.ts:151,155`, `provider-onboarding.module.ts:136,349-350` | commercial register + tax card, MoH facility licence [unverified] | onboarding field sets per market x provider type |
| 15 | Cities/districts, Saudi map centre | `location/schemas/location.schema.ts:6,44` (tree, data-driven), backend geo `geo/geo-sources.ts:62,95` (Nominatim, SA bias to confirm) | governorates/districts data | Data (locations rows per market) |
| 16 | Emergency number 997 | `ai/assistant.service.ts:274`, `ordering/ordering-lifecycle.service.ts:359`, `chat/consultation-window.ts:10` (`EMERGENCY_LINE`) | 123 ambulance [unverified] | MarketConfig `emergency_numbers` |
| 17 | Insurance: Saudi insurers, CCHI/IA regulator list | `catalogs/content/insurance-official.v1.json:8,19,243`; `catalogs/catalogs.controller.ts:127` | different insurers/regulator | Market catalogue data |
| 18 | PDPL / in-Kingdom hosting plan | `common/pdpl-compliance.module`, `admin/ops-security/ops-security.service.ts:198-200`, `docs/platform/R19-data-residency.md` | Egypt PDPL 151/2020, PDPC licence for transfers [unverified] | per-market legal profile + data plane |
| 19 | Arabic legal/ consent / invoice texts | `billing/invoice-pdf.ts:66`, `legal/legal-enterprise.service.ts`, `patient-web/lib/legal/embedded-policies.ts:9,17` ("نظام حماية البيانات الشخصية") | EG law references, operator legal name | legal-text documents per market+language+version |
| 20 | Brand/host `nabd.plus`, CDN `cdn.nabd.plus`, `api.nabd.plus` | `ai/env-chain.ts:86`, `catalogs/catalogs.controller.ts:127`, `maternity/pregnancy-weeks.dto.ts:5`, `provider/provider-badge.controller.ts:26` | partner brand name/domain under the Nabd brand | Branding config (name, logo, domain, support contacts) |
| 21 | AI/OpenRouter headers carry brand | `ai/ai-gateway.service.ts:554` | n/a | Branding |
| 22 | Health-data encryption/PDPL logs | `scripts/encrypt-health-fields.ts`, `common/pdpl-compliance.module` | per market retention | data-plane policy |

## B. Patient app (`patient-app/src`)
| # | Assumption | Evidence | Becomes |
|---|---|---|---|
| 1 | Default currency `SAR`, phone code `+966` in config | `core/config/ConfigManager.ts:224,225` | server MarketContext (client must not hold) |
| 2 | Local DB default `'SAR'`, cart unit price `SAR` | `data/database/schema/tables.ts:225`, `core/platform/commerce/CartManager.ts:86` | money object from server |
| 3 | Login prefixes +966 on bare phone | `auth/patientAuth.ts:11`, `utils/login-credentials.ts:5`, `components/auth/AuthKit.tsx:106` | phone input from market config |
| 4 | Riyadh calendar days for slots; default tz `Asia/Riyadh` | `components/consult/ConsultBooking.tsx:26`, `components/consult/ConsultKit.tsx:116`, `utils/prescription-view.ts:49` | market timezone |
| 5 | Map opens on Riyadh | `components/account/ProvidersMapView.tsx:39`, `components/map-explorer.ts:17` | market map centre |
| 6 | National ID form | `components/consult/NationalIdForm.tsx:8`, `utils/nationalId.ts` | identity plugin |
| 7 | Number locale `ar-SA-u-nu-latn`, Hijri avoided | `components/screen/ScreenKit.tsx:22`, `utils/dates.ts:8` | per-market/locale format |
| 8 | Price formatting uses "ر.س" | `components/pharmacy/OfferKit.tsx:86` | currency symbol table |
| 9 | App name "نبض بلس", package `com.patient.nabd`, slug `nabdah-plus` | `patient-app/app.json:3,4,18,5501`, `app.config.js` | one binary + branding from server; store listing per country |
| 10 | Insurance policy national_id | `components/insurance/InsuranceKit.tsx:45`, `InsuranceHubView.tsx:130` | identity plugin |

## C. Patient web (`patient-web`)
| # | Assumption | Evidence | Becomes |
|---|---|---|---|
| 1 | `"SAR"` fallbacks | `lib/receipt/model.ts:72`, `lib/merchant-feed.ts:31`, `lib/api/offers.ts:79`, `app/[locale]/p/[slug]/page.tsx:150`, `app/llms-full/[file]/route.ts:24` | server currency |
| 2 | Riyadh time zone | `lib/format-slot.ts:1`, `lib/ordering/schedule.ts:38`, `lib/api/dashboard-extras.ts:32`, `app/[locale]/dashboard/page.tsx:19-21`, `app/[locale]/nutrition/page.tsx:128`, `lib/consult/prescription-view.ts:55` | market timezone |
| 3 | Urdu "ر.س" symbol rule | `lib/format-price.ts:6` | currency symbol per locale+currency |
| 4 | Locales `ar,en,ur,hi,bn,fil`, prefix `always`, default `ar`; URL `/{locale}/...` | `i18n/routing.ts:3` | `/{market}-{lang}/` only when 2nd market is near (plan step 8) |
| 5 | Embedded Arabic policies (PDPL) | `lib/legal/embedded-policies.ts:9,17` | legal docs per market |
| 6 | Hosts `api.nabd.plus`, `cdn.nabd.plus`, `live.nabd.plus` | `lib/api/catalog-lookup.ts:3`, `lib/image-hosts.ts:2`, `lib/consult/livekit-url.ts:8`, `lib/api/public-products-server.ts:109` | env/branding per market |
| 7 | SEO: single sitemap/robots/llms, hreflang by language only | `app/sitemap.xml`, `app/sitemaps`, `app/robots.txt`, `app/llms.txt`, `lib/seo.ts`, `lib/sitemap.ts`, `lib/seo.hreflang.test.ts` | per-market sitemaps, hreflang `x-default`, canonical |
| 8 | National ID/iqama for medical reports | `lib/medical-reports/national-id.ts:2`, `lib/api/patient-allowlist.ts:151` | identity plugin |
| 9 | Merchant feed / product JSON-LD currency | `lib/merchant-feed.ts:31`, `app/[locale]/p/[slug]/page.tsx:150` | per-market feed |

## D. Provider app (`provider-app/src`)
| # | Assumption | Evidence | Becomes |
|---|---|---|---|
| 1 | Prefix `+966` in phone field | `components/ui.tsx:223` | phone plugin |
| 2 | Registration forms ask SCFHS number, national ID, IBAN | `screens/doctor/DoctorRegistration.tsx:38`, `screens/nursing/NursingRegistration.tsx:53` | onboarding field sets per market x type |
| 3 | City list (Riyadh, Jeddah, Dammam, Makkah, Madinah…) hard-coded | `constants/index.ts:152`, `screens/shared/shared/MedicalJobsScreen.tsx:354` | locations data |
| 4 | Map default Riyadh | `components/LocationPickerModal.tsx:16` | market map centre |
| 5 | "ر.س" money labels | `screens/doctor/components/DoctorStatsRow.tsx:39`, `screens/ordering/common.tsx:80`, `screens/shared/shared/MedicalDrugIndexScreen.tsx:78` | currency formatter |
| 6 | MoH licence label (31 matches) | provider-app `grep -rn "mohLicense|MOH"` | licence types |
| 7 | Emergency numbers / 997 (11) | provider-app grep `997` | MarketConfig |
| 8 | `ar-SA-u-ca-gregory` dates | `utils/dates.ts:3`, `utils/chatMap.ts:25` | locale formatter |

## E. Admin (`admin/src`)
| # | Assumption | Evidence | Becomes |
|---|---|---|---|
| 1 | Arabic-only admin with "ر.س" | `components/PharmacyOwnDeliveryAdmin.tsx:89`, `components/MedicineQuickEdit.tsx:59`, `lib/service-offers.ts:21`, `lib/refund-policy.ts:17` (`trip_fee_sar`) | currency per market; market switcher |
| 2 | `ar-SA-u-ca-gregory` | `components/AlertsBell.tsx:38`, `utils/app-logs-i18n.ts:12` | formatter |
| 3 | SCFHS tabs (12) | admin grep `SCFHS` | licence list per jurisdiction |
| 4 | National-ID search | `pages/admin/search.tsx:44` | identity plugin |
| 5 | VAT percent form field | `admin` `vat_percent` (4) + `backend/.../admin-finance.dto.ts:15` | market config editor |
| 6 | Search example text with Saudi districts | `pages/admin/search-intelligence.tsx:148` | locale text |
| 7 | One global admin role set; no market scope | `modules/admin/authority/admin-authority.module.ts:21` | market-scoped RBAC |

## F. Not found in code (explicitly)
`CST` / Saudi SMS gateway: **0 matches** in `backend`, `patient-app`, `provider-app`, `admin` (SMS is switched off by owner decision 2026-10-25, `auth/auth.service.ts:459`); `nafath|absher|sehhaty|nphies`: none found in the first grep (confirm in Phase 2).
