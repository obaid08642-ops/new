# Provider and admin matrix (Phase 1, item 12, read-only)

Which roles, screens and fields of the provider app and the admin must become market-scoped, with `file:line` for every row. No code was changed. Backend roles and permissions are B's area (`apis-ui.md`, `data-classification.md`); this file reads them only to tie the client screens to them.

## 1. What exists today

| Fact | Evidence |
|---|---|
| One global role enum shared by backend and provider app: guest, patient, doctor, pharmacy, hospital, hospital_admin, branch_admin, receptionist, lab, radiology, home_care, nursing, nurse, physiotherapist, admin, delivery, super_admin, support_agent, finance, pharmacist | `backend/src/common/enums.ts:1-22`, mirrored in `provider-app/src/types/contracts.ts:4-21` |
| Permissions per role are one global map; `super_admin` holds all, `admin` holds **none** (owner decision 29: an admin holds only the permissions of the custom roles assigned to them) | `backend/src/common/permissions.ts:181-184`; support_agent and finance lists follow at `:185-`+ |
| Admin custom roles are a list of permission strings with no market field: the form posts `{ key, name_ar, permissions, reason }` | `admin/src/pages/admin/rbac.tsx:43` (create), `:56` (assign `custom_role_keys` to a user), `:34` (system + custom roles merged) |
| Admin navigation and route guards use one permission string per page | `admin/src/components/AdminGuard.tsx:11` (`NavItem` = href, label, permission), `:141-214` (`ROUTE_PERMISSIONS`, 65 entries), `useCan()` in the pages |
| Provider types an admin can create | `backend/src/modules/admin/admin.controller.ts:19-23` (`PROVIDER_CREATABLE_ROLES`: doctor, pharmacy, hospital, lab, radiology, nursing, home_care, physiotherapist) |
| No client carries a market or country (0 files in the four source trees mention `market`, `marketId`, `country_code`, `countryCode`, `MarketContext`) | scan in `ui-evidence.md` header; see `client-journeys.md` |

Target (from `lead/MULTI_COUNTRY_PLAN.md`): a permission is `(action, scope)`, where scope is a set of markets (and, for operators, legal entities). A Cairo operator must not see Saudi patients; the platform operator sees all. Roles stay global templates; the **assignment** carries the scope. The server enforces the scope; the admin client only hides what the server would refuse (as `useCan` already does for permissions).

## 2. Admin pages: every page, its guard, and what the scope must do

Columns: the page key, its source file, the permission it needs today, where the guard is defined (`AdminGuard.tsx` line of the nav entry, then of the `ROUTE_PERMISSIONS` entry), the kind of data, and what a market scope must do. The classification is by the data the page shows or changes; it is a requirement, not a description of current code (current code has no scope on any of these pages).

| Page | File | Permission today | Guard (file:line) | Kind of data | What the market scope must do |
|---|---|---|---|---|---|
| `ai-control` | `admin/src/pages/admin/ai-control.tsx` | `settings.edit` | `AdminGuard.tsx:108`, `:204` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `alerts` | `admin/src/pages/admin/alerts.tsx` | `command.center.view` | `AdminGuard.tsx:27`, `:149` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `analytics` | `admin/src/pages/admin/analytics.tsx` | `analytics.read` | `AdminGuard.tsx:31`, `:155` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `analytics-suite` | `admin/src/pages/admin/analytics-suite.tsx` | `analytics.read` | `AdminGuard.tsx:30`, `:154` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `appointments-oversight` | `admin/src/pages/admin/appointments-oversight.tsx` | `appointment.read` | `AdminGuard.tsx:90`, `:153` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `approvals` | `admin/src/pages/admin/approvals.tsx` | `-` | `AdminGuard.tsx:28` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `article-review` | `admin/src/pages/admin/article-review.tsx` | `cms.edit` | `AdminGuard.tsx:86`, `:193` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `audit-logs` | `admin/src/pages/admin/audit-logs.tsx` | `data.export` | `AdminGuard.tsx:110`, `:205` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `broadcast-monitor` | `admin/src/pages/admin/broadcast-monitor.tsx` | `order.read` | `AdminGuard.tsx:91`, `:152` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `catalog-manager` | `admin/src/pages/admin/catalog-manager.tsx` | `catalog.read` | `AdminGuard.tsx:80`, `:176` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `command-center` | `admin/src/pages/admin/command-center.tsx` | `command.center.view` | `AdminGuard.tsx:18`, `:142` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `commissions` | `admin/src/pages/admin/commissions.tsx` | `finance.read` | `AdminGuard.tsx:63`, `:159` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `config-portal` | `admin/src/pages/admin/config-portal.tsx` | `settings.edit` | `AdminGuard.tsx:52`, `:201` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `content-growth` | `admin/src/pages/admin/content-growth.tsx` | `cms.edit` | `AdminGuard.tsx:74`, `:191` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `crm` | `admin/src/pages/admin/crm.tsx` | `crm.read` | `AdminGuard.tsx:70`, `:184` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `dashboard` | `admin/src/pages/admin/dashboard.tsx` | `command.center.view` | `AdminGuard.tsx:23`, `:147` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `disputes` | `admin/src/pages/admin/disputes.tsx` | `disputes.resolve` | `AdminGuard.tsx:59`, `:163` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `facility-members` | `admin/src/pages/admin/facility-members.tsx` | `facility.edit` | `AdminGuard.tsx:44`, `:167` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `finance-suite` | `admin/src/pages/admin/finance-suite.tsx` | `finance.read` | `AdminGuard.tsx:58`, `:157` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `financial-ledger` | `admin/src/pages/admin/financial-ledger.tsx` | `finance.read` | `AdminGuard.tsx:62`, `:158` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `fraud-monitoring` | `admin/src/pages/admin/fraud-monitoring.tsx` | `command.center.view` | `AdminGuard.tsx:34`, `:143` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `gdpr` | `admin/src/pages/admin/gdpr.tsx` | `gdpr.manage` | `AdminGuard.tsx:72`, `:189` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `guest-jobs` | `admin/src/pages/admin/guest-jobs.tsx` | `facility.edit` | `AdminGuard.tsx:85`, `:181` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `health-dashboard` | `admin/src/pages/admin/health-dashboard.tsx` | `command.center.view` | `AdminGuard.tsx:19`, `:145` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `home-curation` | `admin/src/pages/admin/home-curation.tsx` | `cms.edit` | `AdminGuard.tsx:75`, `:192` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `image-suggestions` | `admin/src/pages/admin/image-suggestions.tsx` | `catalog.read` | `AdminGuard.tsx:79`, `:183` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `impersonation` | `admin/src/pages/admin/impersonation.tsx` | `user.impersonate` | `AdminGuard.tsx:94`, `:209` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `insurance-companies` | `admin/src/pages/admin/insurance-companies.tsx` | `order.read` | `AdminGuard.tsx:48`, `:172` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `insurance-queue` | `admin/src/pages/admin/insurance-queue.tsx` | `order.read` | `AdminGuard.tsx:47`, `:171` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `kill-switches` | `admin/src/pages/admin/kill-switches.tsx` | `modules.manage` | `AdminGuard.tsx:105`, `:200` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `legal-policies` | `admin/src/pages/admin/legal-policies.tsx` | `gdpr.manage` | `AdminGuard.tsx:73`, `:190` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `license-expiry` | `admin/src/pages/admin/license-expiry.tsx` | `facility.edit` | `AdminGuard.tsx:42`, `:165` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `live-chat-console` | `admin/src/pages/admin/live-chat-console.tsx` | `crm.read` | `AdminGuard.tsx:89`, `:187` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `locations` | `admin/src/pages/admin/locations.tsx` | `settings.edit` | `AdminGuard.tsx:93`, `:203` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `logs` | `admin/src/pages/admin/logs.tsx` | `system.logs.view` | `AdminGuard.tsx:112`, `:206` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `loyalty-config` | `admin/src/pages/admin/loyalty-config.tsx` | `coupons.manage` | `AdminGuard.tsx:88`, `:195` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `medicines-catalog` | `admin/src/pages/admin/medicines-catalog.tsx` | `catalog.read` | `AdminGuard.tsx:77`, `:175` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `module-switches` | `admin/src/pages/admin/module-switches.tsx` | `modules.manage` | `AdminGuard.tsx:103`, `:199` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `notification-center` | `admin/src/pages/admin/notification-center.tsx` | `notifications.send` | `AdminGuard.tsx:106`, `:197` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `nursing-portal` | `admin/src/pages/admin/nursing-portal.tsx` | `appointment.read` | `AdminGuard.tsx:50`, `:173` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `order-detail` | `admin/src/pages/admin/order-detail.tsx` | `order.read` | `AdminGuard.tsx:-`, `:151` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `payouts` | `admin/src/pages/admin/payouts.tsx` | `finance.read` | `AdminGuard.tsx:60`, `:161` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `pharmacy-price-review` | `admin/src/pages/admin/pharmacy-price-review.tsx` | `catalog.read` | `AdminGuard.tsx:83`, `:179` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `pharmacy-procurement` | `admin/src/pages/admin/pharmacy-procurement.tsx` | `pharmacy.inventory.read` | `AdminGuard.tsx:49`, `:174` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `pregnancy-weeks` | `admin/src/pages/admin/pregnancy-weeks.tsx` | `cms.edit` | `AdminGuard.tsx:87`, `:194` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `price-override-audit` | `admin/src/pages/admin/price-override-audit.tsx` | `catalog.read` | `AdminGuard.tsx:82`, `:178` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `price-reviews` | `admin/src/pages/admin/price-reviews.tsx` | `catalog.read` | `AdminGuard.tsx:84`, `:180` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `provider-audits` | `admin/src/pages/admin/provider-audits.tsx` | `facility.edit` | `AdminGuard.tsx:46`, `:170` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `provider-moderation` | `admin/src/pages/admin/provider-moderation.tsx` | `facility.edit` | `AdminGuard.tsx:41`, `:164` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `rbac` | `admin/src/pages/admin/rbac.tsx` | `rbac.manage` | `AdminGuard.tsx:100`, `:207` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `refund-policy` | `admin/src/pages/admin/refund-policy.tsx` | `finance.read` | `AdminGuard.tsx:64`, `:160` | Configuration | Edited per market (versioned, effective-dated); a default or kill switch that affects every market needs the global role. |
| `reports` | `admin/src/pages/admin/reports.tsx` | `analytics.read` | `AdminGuard.tsx:32` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `returns` | `admin/src/pages/admin/returns.tsx` | `finance.payout.approve` | `AdminGuard.tsx:61`, `:162` | Money | Scoped by market and legal entity; totals per currency, never added across currencies; export carries the currency. |
| `risk-dashboard` | `admin/src/pages/admin/risk-dashboard.tsx` | `analytics.read` | `AdminGuard.tsx:35`, `:144` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `scheduled-reports` | `admin/src/pages/admin/scheduled-reports.tsx` | `reports.schedule.manage` | `AdminGuard.tsx:109`, `:208` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `search` | `admin/src/pages/admin/search.tsx` | `user.read` | `AdminGuard.tsx:33` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `search-intelligence` | `admin/src/pages/admin/search-intelligence.tsx` | `analytics.read` | `AdminGuard.tsx:76`, `:156` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `security` | `admin/src/pages/admin/security.tsx` | `-` | `AdminGuard.tsx:113` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `segments` | `admin/src/pages/admin/segments.tsx` | `crm.read` | `AdminGuard.tsx:71`, `:185` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `seha-missing` | `admin/src/pages/admin/seha-missing.tsx` | `appointment.read` | `AdminGuard.tsx:43`, `:166` | Provider and licence queue | Queue per market and jurisdiction; licence rules, documents and expiry zone come from the provider's jurisdiction. |
| `service-offers` | `admin/src/pages/admin/service-offers.tsx` | `facility.edit` | `AdminGuard.tsx:45`, `:168` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `service-proposals` | `admin/src/pages/admin/service-proposals.tsx` | `catalog.read` | `AdminGuard.tsx:81`, `:177` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `shortage-reports` | `admin/src/pages/admin/shortage-reports.tsx` | `catalog.read` | `AdminGuard.tsx:78`, `:182` | Catalogue and reference | Global concept plus a per-market registration: an edit says which market it applies to; a global edit needs the global role. |
| `support-tickets` | `admin/src/pages/admin/support-tickets.tsx` | `crm.read` | `AdminGuard.tsx:51`, `:186` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `system-ops` | `admin/src/pages/admin/system-ops.tsx` | `ops.queues.manage` | `AdminGuard.tsx:101`, `:198` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `today` | `admin/src/pages/admin/today.tsx` | `command.center.view` | `AdminGuard.tsx:25`, `:148` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `users-management` | `admin/src/pages/admin/users-management.tsx` | `user.read` | `AdminGuard.tsx:92`, `:188` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `web-vitals` | `admin/src/pages/admin/web-vitals.tsx` | `command.center.view` | `AdminGuard.tsx:21`, `:146` | Platform operation | Global only: the platform operator role; no market filter, every action audited with the actor's scope. |
| `orders (index)` | `admin/src/pages/admin/orders/index.tsx` | `order.read` | `AdminGuard.tsx:29` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |
| `orders/[kind]/[id]` | `admin/src/pages/admin/orders/[kind]/[id].tsx` | `order.read` | `AdminGuard.tsx:29` | Market-scoped records | List, detail, export and every action filtered to the operator's markets; a market the operator lacks answers 403, not an empty list. |

Counts: 68 page files in `admin/src/pages/admin/` plus the `orders/` folder (2 files). Market-scoped records 29 (27 pages plus the two `orders` rows), money 11, configuration 9, catalogue and reference 9, provider and licence queue 6, platform operation 6: 70 rows in all.

### Admin fields and components that need the scope inside the page

| Component | What it shows | Assumption (file:line) | Change |
|---|---|---|---|
| Provider detail | Licence numbers (`license_number`, `moh_license_number`, `scfhs_license_number`, `sfda_license_number`), commission fields, national ID | `admin/src/components/ProviderFullDetail.tsx:114,127,364` | Field list and labels from the provider's (market, type); commission per market; mask IDs by market |
| Finance config | One `vat_percent` and `vat_rate`, one set of commission percents | `admin/src/pages/admin/finance-suite.tsx:10` | Config per market; VAT per market; report per currency |
| Locations | Region, city, district reference lists | `admin/src/pages/admin/locations.tsx:69`, `admin/src/components/GeoPicker.tsx:7`, `users-management.tsx:51`, `provider-moderation.tsx:87` | One tree per market |
| Own-delivery admin | Delivery zones by districts or radius | `admin/src/components/PharmacyOwnDeliveryAdmin.tsx:5` | Sub-division list per market |
| Dates and numbers | Arabic digits, `ar-SA`, one calendar choice | `admin/src/utils/dates.ts:24-26`, 53 files with `ar-SA` (`ui-evidence.md` P3) | Operator's zone; show the zone |
| Global search | Search by national ID, phone or name | `admin/src/pages/admin/search.tsx:44` | Search inside the operator's markets only |
| Impersonation | Support sessions that act as a user | `admin/src/pages/admin/impersonation.tsx` (permission `user.impersonate`, `AdminGuard.tsx:94`) | Only users of the operator's markets; the session records the market |
| Audit log | Actor, action, target | `admin/src/pages/admin/audit-logs.tsx` (backend schema `audit-log.schema.ts:25`, B) | Rows carry `market_id` and the actor's scope; filter by both |

## 3. Provider app: types, screens and market-dependent fields

The provider app is one app for six provider types. The type decides the dashboard and the registration screen; there is no market.

| Type | Registration screen | Dashboard / main screens | Market-dependent fields and rules (file:line) | Change |
|---|---|---|---|---|
| Doctor | `src/screens/doctor/DoctorRegistration.tsx` | `src/screens/doctor/doctor/*` | SCFHS number and expiry, national ID, IBAN, specialty: `DoctorRegistration.tsx:38-39`; working days `:88`; region / city / district `:60` | Form schema per (market, type); licence per jurisdiction |
| Nurse / home nursing | `src/screens/nursing/NursingRegistration.tsx` | `src/screens/nursing/*` | National ID `NursingRegistration.tsx:430`, CR number `:434`, region / city / district `:63` | Same |
| Pharmacy | `src/screens/pharmacy/PharmacyRegistration.tsx` | `src/screens/pharmacy/PharmacyDashboard.tsx`, `OwnDeliveryForm.tsx` | CR, MoH licence, SFDA number, licence expiry, tax number: `PharmacyRegistration.tsx:44,73`; delivery zones by district `ownDelivery.ts:7`, `OwnDeliveryForm.tsx:12` | Same; zones by the market's sub-division |
| Lab | `src/screens/lab/LabRegistration.tsx` | `src/screens/lab/LabDashboard.tsx`, slot capacity card `RealScreens.tsx:230` | CR (10 digits) `LabRegistration.tsx:526`, working days `:102`, region / city `:42` | Same |
| Radiology | `src/screens/lab/LabRegistration.tsx:277` (`RadiologyRegistration`, shares the file with the lab) | `src/screens/radiology/RadiologyDashboard.tsx`, slot capacity card `RealScreens.tsx:231` | Weekday list from Sunday `RadiologyDashboard.tsx:587-588` | Week and weekend from the market |
| Hospital / facility | `src/screens/facility/FacilityRegistration.tsx` | `src/screens/facility/FacilityDashboard.tsx`, shifts, leave, resources | Working days `FacilityRegistration.tsx:32`, region / city / district `:52`, shifts `ShiftManagementScreen.tsx:66-68`, orders text with `SAR` `FacilityOrdersTab.tsx:73` | Same; staff roles below |

Shared provider-app pieces:

| Piece | Assumption (file:line) | Change |
|---|---|---|
| Client validators | Phone `05…`/`5…` and `+966` formatting `src/security/Security.ts:197-208`; Saudi IBAN (`SA`, 24 characters) `:210-218`; CR as 10 digits `:221-223`; SCFHS validator `:225-227` | Move validation to the server per market; the client only formats |
| Phone input | Fixed ` +966` label, `maxLength={10}` `src/components/ui.tsx:223-226` | Country picker |
| Locations | City list `CITIES` headed "Saudi Cities" `src/constants/index.ts:150-152`; default pin Riyadh `src/components/LocationPickerModal.tsx:16`; `GeoPicker.tsx:9` | Locations from the server |
| Licence expiry | `LicenseExpiryField` `src/screens/registration/WizardParts.tsx:170` (expiry as a date, evaluated end of day Riyadh time per `docs/platform/LICENCE-EXPIRY-OPTIONS.md`) | Expiry in the jurisdiction's zone |
| Money | `fmtMoney` `src/screens/ordering/common.tsx:80` (`ar-SA`); wallet balance with no currency `src/screens/shared/ProviderHome.tsx:23,137`; withdrawals use banks from the server (`/provider/banks`, `src/screens/shared/shared/WithdrawalWorkflow.tsx:64`) which is already market-neutral | Currency on every amount; banks per market |
| Dates | `ar-SA` with the Gregorian calendar pinned `src/utils/dates.ts:3`, `src/utils/chatMap.ts:25` | Locale from language |
| Emergency default | `consultationThread.ts:23` (`997`) | Market config |
| Medical jobs | Job roles and Saudi city chips `src/screens/shared/shared/MedicalJobsScreen.tsx:203,354`, `MedicalJobsPostTab.tsx:54` | Cities from the server; roles from the catalogue |

### Staff and sub-account roles (inside a provider organization)

A facility adds sub-accounts with a fixed role list, and each role says whether an SCFHS licence is required (`needsScfhs`): doctor, insurance coordinator, receptionist, nurse, lab technician, pharmacist, radiologist (`src/screens/facility/facility/AddSubAccountScreen.tsx:63-70`). The regulator name and the licence requirement are Saudi (SCFHS); the roles themselves are market-neutral. Change: the role list and the licence requirement come from the (market, type) schema; the sub-account inherits the organization's market.

## 4. Roles that must become market-scoped (summary)

| Role | Today | Needed |
|---|---|---|
| super_admin | all permissions, global | Platform operator: all markets, plus the global-only pages (`G`) |
| admin (with custom roles) | only the custom roles' permissions, global (`permissions.ts:181-184`, `rbac.tsx:43,56`) | Custom role assignment carries a market set (and legal entity); the role template stays global |
| support_agent | read lists, impersonation, command center (`permissions.ts:185-`) | Market-scoped; impersonation limited to the market's users |
| finance | read lists plus finance (`permissions.ts`, finance pages) | Market and legal-entity scoped; per-currency totals |
| Provider roles (doctor, nurse, pharmacy, lab, radiology, hospital, home_care, physiotherapist) | One account, no organization, no market (`contracts.ts:4-21`) | Organization, legal entity, branch, offering; account and licence tied to a market / jurisdiction |
| Facility staff (hospital_admin, branch_admin, receptionist, delivery, pharmacist) | Sub-accounts of a facility (`AddSubAccountScreen.tsx:63-70`) | Inherit the organization's market; licence per jurisdiction |
| patient, guest | One account | Account market, active market and service country are separate (Phase 2) |

## 5. Gaps that block market-scoped roles

1. The role and permission model has no scope dimension on either side (`permissions.ts:181`, `rbac.tsx:43`); adding it is a backend step first (Phase 3 step 4), then the admin hides what the server refuses (step 8).
2. The admin has no market switcher and no market filter on any list or export (0 files mention a market).
3. Audit rows need `market_id` and the actor's scope before a scoped operator can be audited (B: `audit-log.schema.ts:25`).
4. Provider licence and document types are hard-wired to SCFHS / MoH / SFDA in the provider app and the admin detail (`DoctorRegistration.tsx:38-39`, `PharmacyRegistration.tsx:44`, `ProviderFullDetail.tsx:114`).
