# UI impact matrix (Phase 1, item 11, read-only)

Every screen, field or behaviour in patient-app, patient-web, provider-app and admin that carries a Saudi assumption, with the `file:line` where the assumption lives, what it must become, and the Phase 3 step of `lead/MULTI_COUNTRY_PLAN.md` that changes it (3 constants to one source, 5 identity / phone / address / OTP plugins, 6 providers / licences / catalogue, 7 money / tax / invoice, 8 apps / web / admin market-aware, 9 integrations). No code was changed.

How the rows were found: plain `grep -rnE` scans over the source of the four apps (tests, `node_modules`, locale catalogues, generated translation files excluded), then a read of every hit's surrounding code. The **complete** list of hits per concern and per app is in `ui-evidence.md` (625 hits in total); the rows below are the curated reading, grouped by concern. A row cites the lines that define the assumption; "also" lists further files with the same pattern, by name, with their lines in `ui-evidence.md`.

Two findings apply to every row:

- **No client has a market concept** (0 files mention `market`, `marketId`, `country_code`, `countryCode` or `MarketContext` in any of the four source trees). Each row below is therefore a constant, regex, formatter or literal, never a configuration value.
- **Web is more server-driven than the app and provider app.** Where the web already sends raw input to the server and renders what comes back (phone, emergency number), the app and provider app still carry a client-side Saudi rule. Closing that gap first makes the app match the web.

## A. Phone input, validation and display

| # | App | Screen / component | Field | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| A1 | patient-app | Login, register, OTP, forgot password | Phone or e-mail identifier | `+966` is added to any number without a country code, leading zeros stripped, `966` + 9 digits accepted: `src/auth/patientAuth.ts:11-20`; same rule in `src/utils/login-credentials.ts:5` | Country picker from the market's dial codes; E.164 built and validated by the server | 5 |
| A2 | patient-app | Phone field | Fixed prefix chip | `components/auth/AuthKit.tsx:106` (the chip is shown as `+966`) | Chip shows the selected country's code | 5 |
| A3 | patient-app | Config | Default phone code and currency | `src/core/config/ConfigManager.ts:224-225` (`defaultCurrency: 'SAR'`, `defaultPhoneCode: '+966'`) | Replace by values read from the server's market config | 3 |
| A4 | patient-app | Text direction | Phone runs inside RTL lines | `src/utils/bidi.ts:1` (phone-like runs `+966 5x…` kept left-to-right) | Pattern must not assume `+966 5`; keep the rule for any `+` run | 8 |
| A5 | patient-web | Register, login | Identifier | Generic regex only, raw value sent to the server for normalising: `components-next/register-form.tsx:67,74,90`; schema `app/api/auth/register/route.ts:10`. **No Saudi rule in the web client** | Add the country picker (placeholder and hint), keep sending raw | 5 |
| A6 | patient-web | Emergency contacts, help, courier / nurse phones | Free phone text | Generic patterns, market-neutral: `components-next/health/emergency-contacts-editor.tsx:88`, `app/[locale]/settings/help/page.tsx:76`, `app/[locale]/nursing/visits/[visitId]/page.tsx:62`, `lib/pharmacy/order-view.ts:276`, `lib/api/urgent-help.ts:22` | None now (list as already neutral) | - |
| A7 | provider-app | Login and registration | Phone | Only `05xxxxxxxx` or `5xxxxxxxx` is valid: `src/security/Security.ts:197-200`; display and storage form `+966…`: `Security.ts:202-208` | Validate by the market's numbering plan on the server; format from the country | 5 |
| A8 | provider-app | Shared phone input | Country label and length | Fixed ` +966` label, `maxLength={10}`: `src/components/ui.tsx:223-226` | Country picker; length from the plan | 5 |
| A9 | admin | CRM, search, user pages | Phone shown / searched | Search by phone is free text (`admin/src/pages/admin/search.tsx:44`); no phone rule in admin code (0 `+966` hits in `ui-evidence.md` P1) | Search must accept E.164; show the country | 8 |

## B. Identity documents (national ID, iqama)

| # | App | Screen / component | Field | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| B1 | patient-app | Medical report request | National ID / iqama | 10 digits starting with 1 or 2: `src/utils/nationalId.ts:19`; form `src/components/consult/NationalIdForm.tsx` (owner decision 6: asked only when a report needs it) | Document types and formats per market from the server | 5 |
| B2 | patient-web | Medical report request | Same | `lib/medical-reports/national-id.ts:19` (same regex); form `components-next/medical-reports/national-id-form.tsx:14`; API allow-list `lib/api/patient-allowlist.ts:151` | Same | 5 |
| B3 | provider-app | Doctor and nurse registration | National ID | `src/screens/doctor/DoctorRegistration.tsx:38` (`nationalId`), `src/screens/nursing/NursingRegistration.tsx:430` | Dynamic form schema per (market, provider type) | 6 |
| B4 | provider-app | Registration | Commercial register (CR) number | 10 digits: `src/security/Security.ts:221-223`; fields `PharmacyRegistration.tsx:44,73`, `LabRegistration.tsx:526`, `NursingRegistration.tsx:434` | Registration number format per market | 6 |
| B5 | admin | Provider detail, global search | National ID shown / searched | `components/ProviderFullDetail.tsx:364` (label "رقم الهوية الوطنية / الإقامة"), `pages/admin/search.tsx:44` | Label and mask per market; scope by market | 8 |

## C. Money: currency, symbols and number formats

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| C1 | patient-app | Offers, payment, insurance decision, payment result | Currency symbol | `components/pharmacy/OfferKit.tsx:86-89` (`SAR` shown as the app's own "ر.س"), `app/pharmacy/payment.tsx:183`, `app/pharmacy/insurance-decision.tsx:188`, `app/payments/result.tsx:157`; key `pharmacy.currency` = "ر.س" (`src/i18n/locales/ar.json:147`) / "SAR" (`en.json:147`); symbol map `src/i18n/index.ts:167` | One `formatMoney(amount_minor, currency)`; symbol and digits from the currency, language from the user | 7 |
| C2 | patient-app | Local cart | Cart currency | `src/core/platform/commerce/CartManager.ts:86-87,100` (`'SAR'` literal), local table default `src/data/database/schema/tables.ts:225` | Cart carries the offer's currency | 7 |
| C3 | patient-app | Receipt | Default currency | `src/utils/receipt.ts:131` (`?? 'SAR'`) | Currency required from the server, no default | 7 |
| C4 | patient-app | Every amount (38 files call `money()`) | Two decimals, no currency | `src/components/screen/ScreenKit.tsx:50` (`money`), number locale per language `ScreenKit.tsx:22` | Decimals from the currency (0, 2 or 3) | 7 |
| C5 | patient-web | All pharmacy, offers, checkout screens (29 files call `formatPrice`) | Price text | Currency fixed to SAR: `lib/format-price.ts:18`; Urdu uses a hand-set riyal symbol `format-price.ts:9`; offer format `components-next/pharmacy-offers/format.ts:11`; `lib/api/offers.ts:79` (`?? "SAR"`) | `formatPrice(locale, amount, currency)` | 7 |
| C6 | patient-web | Payment capability calls | Currency accepted | `z.literal("SAR")` in three API routes: `app/api/payments/pharmacy/[orderId]/capabilities/route.ts:11`, `app/api/appointments/[appointmentId]/payment-capabilities/route.ts:11`, `app/api/insurance/requests/[requestId]/payment-capabilities/route.ts:11`; client types `components-next/consultation-payment-action.tsx:12`, `components-next/insurance/insurance-request-view.tsx:22` | Currency enum from the market config | 7 |
| C7 | patient-web | Receipt | Currency default | `lib/receipt/model.ts:72` (`?? "SAR"`) | As C3 | 7 |
| C8 | patient-web | SEO and feeds | Structured-data price currency | `lib/seo/json-ld.ts:37`, `app/[locale]/p/[slug]/page.tsx:150`, `lib/merchant-feed.ts:31`, `app/llms-full/[file]/route.ts:24`, `lib/nursing/service-pages.ts:62` (all `|| "SAR"`) | Currency of the product row | 7 |
| C9 | provider-app | Orders, revenue, withdrawals | Money text | `src/screens/ordering/common.tsx:80` (`fmtMoney`, `ar-SA`), literal `SAR` in `src/screens/facility/facility/FacilityOrdersTab.tsx:73`, "ر.س" in revenue views (`ui-evidence.md` P2: 18 hits, 16 files) | Same formatter as C1 | 7 |
| C10 | admin | Orders list, finance, commissions, refund policy | Amounts and VAT | `pages/admin/finance-suite.tsx:10` (`vat_percent`, `vat_rate` as one global number), orders amount column `pages/admin/orders/index.tsx:72`; 67 hits in 30 files (`ui-evidence.md` P2) | Reports per currency, never summed across currencies; VAT per market | 7 |

## D. Time, calendar and week

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| D1 | patient-app | Lab, radiology, home-care and consultation booking | Slots are Riyadh calendar days / clock time (UTC+3, no DST) | `src/utils/riyadh.ts:2`, `src/utils/orderingBooking.ts:128,145`, `src/components/consult/ConsultBooking.tsx:9,26`, `app/diagnostics/when.tsx:32` | Zone of the provider's market from the server; one `Intl` helper | 3 |
| D2 | patient-app | Prescription view | Fallback zone | `src/utils/prescription-view.ts:49` (`|| 'Asia/Riyadh'`) | Fallback from market config | 3 |
| D3 | patient-app | All dates | Hijri or Gregorian choice and `ar-SA` | `src/utils/dates.ts:8,62` (`ar-SA-u-ca-islamic-umalqura` / `ar-SA-u-ca-gregory`); `ScreenKit.tsx:22` | Calendars offered per language and market | 8 |
| D4 | patient-web | Slots, greeting, nutrition day | Riyadh zone | `lib/time/riyadh.ts:2`, `lib/ordering/schedule.ts:38,43`, `lib/format-slot.ts:1`, `app/[locale]/dashboard/page.tsx:19-21` (greeting by Riyadh hour), `app/[locale]/nutrition/page.tsx:128`, `lib/api/dashboard-extras.ts:32`, `components-next/home-care-booking-form.tsx:26`, `lib/consult/prescription-view.ts:55` | As D1 | 3 |
| D5 | provider-app | Working hours, shifts, slots | Weekday lists start on Sunday and name every day; there is no weekend or week-start setting | `src/screens/doctor/DoctorRegistration.tsx:88`, `src/screens/facility/FacilityRegistration.tsx:32`, `src/screens/lab/LabRegistration.tsx:102`, `src/screens/radiology/RadiologyDashboard.tsx:587-588`, `src/screens/facility/facility/ShiftManagementScreen.tsx:66-68`, `src/screens/shared/RealScreens.tsx:107` | Week start and weekend from market config | 3 |
| D6 | provider-app | Dates and times | `ar-SA` locale with the Gregorian calendar pinned | `src/utils/dates.ts:3`, `src/utils/chatMap.ts:25`; 21 hits in 17 files (`ui-evidence.md` P3) | Locale from language, calendar from market | 8 |
| D7 | admin | Every list, alert and log (53 files use `ar-SA`) | Arabic digits, Riyadh-neutral | `admin/src/utils/dates.ts:24-26`, `components/AlertsBell.tsx:38,47`, `pages/admin/today.tsx:38`, `pages/admin/alerts.tsx:25-26`, `pages/admin/price-reviews.tsx:19` | One helper with the operator's zone; show the zone | 8 |

## E. Address, city lists and maps

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| E1 | patient-app | Address book, location picker, pharmacy draft | Fields street / district / city; Saudi short address (4 letters + 4 digits) fills the address | `src/components/account/AddressBookView.tsx:150`, `src/components/account/LocationPickerView.tsx:23`, `src/utils/pharmacy-draft.ts:4`, `src/utils/selectedAddress.ts:11`, `src/utils/pharmacyCheckout.ts:211` | Address template per market (field list, order, required, verification plugin) | 5 |
| E2 | patient-web | Address book | Same, plus national-address lookup | `components-next/account/address-book.tsx:53`, `components-next/account/geo-select.tsx:8`, `lib/api/patient-allowlist.ts:32`, `lib/account/address-form.ts:11`, `lib/pharmacy/delivery-address.ts:11` | Same | 5 |
| E3 | patient-app | Map screens | Map opens on Riyadh | `src/components/account/ProvidersMapView.tsx:39-40`, `src/components/map-explorer.ts:17-18` (`DEFAULT_CENTRE` 24.7136, 46.6753) | Centre from the market or the device position | 3 |
| E4 | patient-web | Map picker and explorer | Same | `lib/geo/map.ts:6-7`, `lib/map/explorer-model.ts:10`, `components-next/account/address-map/map-canvas.tsx:21`; reverse geocode answers our city / district codes `lib/geo/reverse.ts:11`, `app/api/geo/reverse/route.ts:15` | Same | 3 |
| E5 | provider-app | Registration (all five types), pickers | City list and default pin | `src/constants/index.ts:150-152` (the constant `CITIES`, headed "Saudi Cities": `{ id: 'riyadh', ar: 'الرياض', en: 'Riyadh' }`, then Jeddah, Mecca, Medina, Dammam, …), `src/components/LocationPickerModal.tsx:16`, `src/components/GeoPicker.tsx:9`, city chips in `src/screens/shared/shared/MedicalJobsScreen.tsx:354`; region / city / district in `DoctorRegistration.tsx:60`, `FacilityRegistration.tsx:52`, `LabRegistration.tsx:42`, `NursingRegistration.tsx:63`, `PharmacyRegistration.tsx:48`; delivery zones by district `src/screens/pharmacy/ownDelivery.ts:7`, `OwnDeliveryForm.tsx:12` | Locations from the server per market; zones by the market's sub-division | 6 |
| E6 | admin | User, provider moderation, locations, own-delivery admin | Region / city / district pickers and edits | `components/GeoPicker.tsx:7`, `pages/admin/users-management.tsx:51`, `pages/admin/provider-moderation.tsx:87`, `pages/admin/locations.tsx:69`, `components/PharmacyOwnDeliveryAdmin.tsx:5` | Location editor scoped by market | 8 |
| E7 | patient-web | SEO city and neighbourhood pages | Saudi URL tree `/doctors/{specialty}/{city}/{neighborhood}` | `app/[locale]/doctors/[specialty]/[city]/page.tsx`, `…/[neighborhood]/page.tsx:28`, `app/[locale]/radiology/[serviceSlug]/[citySlug]/page.tsx` | City slugs per market when a 2nd market opens | 8 |

## F. Legal, authority and tax wording

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| F1 | patient-web | Terms, privacy, refund policy, telehealth consent | Saudi legal text embedded in the bundle | `lib/legal/embedded-policies.ts:9,33`, `lib/legal/policy-list.ts`, `lib/legal/telehealth-consent.ts` | Documents served per (market, locale) | 8 |
| F2 | patient-web | Data rights | Saudi law articles named (PDPL Art. 20, Art. 23) | `components-next/settings/data-rights.tsx:11,51`, `app/[locale]/settings/privacy/page.tsx:37` | Wording per market law | 8 |
| F3 | patient-app, patient-web | Doctor card | "Licensed by SCFHS, no. X" | `patient-app/src/components/consult/Differentiators.tsx:52`, `patient-web/components-next/consult/differentiators.tsx:9` | Regulator name and number format from the provider's licence record | 6 |
| F4 | patient-web, patient-app | Receipt | ZATCA phase-1 QR (seller, VAT number, time, total, VAT), VAT row | `patient-web/lib/receipt/tlv.ts:1-2`, `components-next/receipt/receipt-paper.tsx:16,21`; app `src/utils/receipt.ts:131` (seller and QR fields) | Tax and e-invoice block per operator and market | 7 |
| F5 | provider-app | Registration, licence screens | SCFHS, MoH, SFDA numbers, licence expiry | `DoctorRegistration.tsx:38-39` (`scfhsNumber`, `licenseExpiry`), `PharmacyRegistration.tsx:44` (`crNumber`, `mohLicense`, `sfdaNumber`), `src/screens/registration/WizardParts.tsx:170` (`LicenseExpiryField`), validator `src/security/Security.ts:225-227` (`scfhs`) | Licence fields and documents per (market, type, jurisdiction) | 6 |
| F6 | provider-app | Bank details | Only a Saudi IBAN passes | `src/security/Security.ts:210-218` (`startsWith('SA')`, 24 characters, mod 97) | Payout method per market | 6 |
| F7 | admin | Provider detail, finance config | Licence number fields and commission, VAT | `components/ProviderFullDetail.tsx:114` (`license_number`, `moh_license_number`, `scfhs_license_number`, `sfda_license_number`), `:127` (commission fields), `pages/admin/finance-suite.tsx:10` | Field set and label per market | 6 / 7 |

## G. Emergency, support and contact numbers

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| G1 | patient-app | Consultation chat | Emergency line default | `src/components/consult/chatPermissions.ts:22` (`DEFAULT_EMERGENCY_LINE = '997'`) | Fallback from market config | 3 |
| G2 | patient-web | Consultation chat | Same | `app/[locale]/chat/[threadId]/page.tsx:81` (`?? "997"`) | Same | 3 |
| G3 | provider-app | Consultation thread | Same | `src/screens/doctor/doctor/consultationThread.ts:23` | Same | 3 |
| G4 | patient-app, patient-web | Urgent-help screen | Number and who is called come from the server (admin config); the screens are already market-neutral | `patient-app/src/components/emergency/UrgentHelpView.tsx:67`, `patient-web/app/[locale]/emergency/page.tsx:20,49`, `lib/api/urgent-help.ts:22` | None now; the server's config must become per market | - |

## H. Payment gateway and methods

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| H1 | patient-app | Payment screens (5) | Gateway id carried as `moyasarId` | `app/insurance/copay.tsx:60`, `app/nursing/nurse-profile.tsx:190`, `app/diagnostics/confirm.tsx:166`, `app/diagnostics/insurance-approval.tsx:123`, `app/diagnostics/booking-status.tsx:231` | Gateway-neutral `paymentId` | 9 |
| H2 | patient-app | Method list | Apple Pay as an iOS method in a fixed list | `src/constants/index.ts:61`, `src/types/index.ts:435` | Method list from the server per market | 9 |
| H3 | patient-app | Hosted payment page | Only gateway hosts the backend uses are opened | `src/utils/pharmacyCheckout.ts:314` | Allow-list from market config | 9 |
| H4 | patient-app | Payment layer | A gateway interface exists (a seam) | `src/core/platform/payment/PaymentProvider.ts:24` ("Stripe, PayTabs, Moyasar, etc. MUST implement") | Use it as the plugin boundary | 9 |
| H5 | patient-web | Checkout | Redirects to the hosted Moyasar page | `components-next/ordering/confirm-client.tsx:103`; agent and policy texts name Moyasar: `app/auth.md/route.ts:17`, `app/.well-known/acp.json/route.ts:26` | Redirect to the market's gateway; neutral wording | 9 |

## I. SEO, deep links, store identity and brand

| # | App | Screen / component | Behaviour | Saudi assumption (file:line) | Change | Step |
|---|---|---|---|---|---|---|
| I1 | patient-web | Locales and routes | Six locales under `/{locale}`, no country | `lib/i18n.ts:1`; `/{cc}-{lang}/` is not possible today | URL scheme per market only when a second market is near | 8 |
| I2 | patient-web | hreflang | All six locales plus `x-default` Arabic | `lib/seo.ts:17,55` | Per market alternates | 8 |
| I3 | patient-web | Site origin, sitemaps, robots, llms | One origin `https://nabd.plus` and one API origin | `lib/seo.ts:4`, `lib/llms-full.ts:8`, `lib/sitemap.ts:18` (`https://api.nabd.plus`), `app/sitemap.xml/route.ts`, `app/sitemaps/*` (articles, conditions, doctors, facilities, labs, locations, nursing, pharmacies, products, radiology), `app/robots.txt`, `app/llms.txt/route.ts:19` ("a Saudi healthcare platform") | Sitemaps and canonicals per market | 8 |
| I4 | patient-web | JSON-LD | Country is `SA` | `lib/seo/structured-data.ts:47,91` (`addressCountry: "SA"`), price currency C8 | From the entity's market | 8 |
| I5 | patient-app | App identity | Name, scheme, package, universal-link hosts | `app.json:3` (name "نبض بلس"), `:12` (`nabdplus`), `:18` (`com.patient.nabd`), `:19-60` (Android intent filters on `app.nabd.plus` with path prefixes), `:5503-5506` (`associatedDomains`: `app.nabd.plus`, `nabd.plus`, `www.nabd.plus`) | One app for all markets keeps one identity; store listing assets per country are outside the code | 8 |
| I6 | patient-web | Universal links | iOS association file | `app/.well-known/apple-app-site-association/route.ts:5` | Same identity; add domains only with a new brand domain | 8 |

## J. Roles, permissions and scope (summary; detail in `provider-admin-matrix.md`)

| # | App | Behaviour | Saudi / single-market assumption (file:line) | Change | Step |
|---|---|---|---|---|---|
| J1 | admin | Navigation and route guards by one global permission list | `components/AdminGuard.tsx:11` (`NavItem`), `:141` (`ROUTE_PERMISSIONS`), `pages/admin/rbac.tsx:34` | Permission = (action, market scope) | 8 |
| J2 | provider-app | One role per account; screens branch on `user.role` | `src/types/contracts.ts:4-21` (role enum), `src/screens/shared/RealScreens.tsx:230-231` | Provider belongs to an organization and market | 6 |

## Items checked and found market-neutral (no change needed now)

- patient-web phone handling (A5, A6) and the urgent-help screens (G4).
- Language handling: six languages are independent of the country in both patient clients (`patient-web/lib/i18n.ts:1`, app locale files); only the number locale map (`ScreenKit.tsx:22`) mixes language and country (`ar-SA`, `ur-PK`, `hi-IN`, `bn-BD`), which is a market question when a second Arabic-speaking market opens.
- Payment layer boundary exists in the app (H4), and libphonenumber is already a backend dependency (`backend/package.json:59`).

## Summary counts (from `ui-evidence.md`)

| concern | patient-app | patient-web | provider-app | admin |
|---|---|---|---|---|
| P1 phone | 6 hits, 5 files | 0 | 5 hits, 2 files | 0 |
| P2 currency | 22 hits, 16 files | 32 hits, 24 files | 18 hits, 16 files | 67 hits, 30 files |
| P3 time zone, `ar-SA` | 32 hits, 9 files | 34 hits, 9 files | 21 hits, 17 files | 36 hits, 25 files |
| P4 Riyadh map centre | 3 hits, 3 files | 3 hits, 2 files | 6 hits, 4 files | 0 |
