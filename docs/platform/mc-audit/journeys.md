# Journeys: what differs by market (Phase 1, read-only)

Routes are `@Controller` prefixes in `backend/src/modules/*` (grep `@Controller(`). SA = today, EG = second market. EG items are **[unverified]**. "Change" = what must become per-market. No journey's *flow* changes (pharmacy broadcast + offers stays); only inputs, rules, money, texts and plugins.

## Patient journeys
| # | Step | Backend route / module | SA today (evidence) | EG difference | Change |
|---|---|---|---|---|---|
| 1 | Open app / pick market | `GET` config (`modules/config`, `system-config`), app `core/config/ConfigManager.ts:224-225` | one market, client holds currency + `+966` | market must come from the server (MarketContext), not from client; traveller with SA account in EG | server resolves market (account market, then selected, then device hint; never trusted blindly) |
| 2 | Sign up / login | `auth/*` (`@Controller('auth')`), `auth/auth.service.ts:423-441,541` | phone canonical `+966`, country allow-list, no SMS (push/email) `auth.service.ts:459` | `+20`, 11-digit; OTP channel differs; email-first may be needed | phone plugin; OTP plugin; allow-list in MarketConfig |
| 3 | Address | `users/me/addresses`, `national-address` (`users/users.addresses.controller.ts:22-28`) | Saudi short address (SPL) verified | governorate / district / street / building / landmark | address template per market; verification plugin optional |
| 4 | Search (doctors, medicines, labs…) | `search`, `search-intent`, `doctors`, `catalogs` | city names, Arabic, SA specialties; `cdn.nabd.plus` | local city/district names, local medicine registry | market-scoped catalogue registrations + locations |
| 5 | Book doctor (clinic/online/home) | `booking/flow`, `bookings`, `unified-bookings`, `doctors/appointments`, `care/appointments` | price in SAR halalas, Riyadh slot days (`ConsultBooking.tsx:26`), SCFHS-licensed doctors only | EGP, Cairo days, local licence | MarketContext on quote; licence per jurisdiction |
| 6 | Video consult | `consultations`, `livekit`, `coturn`, `chat/consultation-window.ts:10` (emergency line 997) | LiveKit at `live.nabd.plus` (`patient-web/lib/consult/livekit-url.ts:8`) | telehealth rules; media may need in-country relay [unverified] | per-cell LiveKit/TURN; emergency numbers config; cross-border consult denied by default |
| 7 | Pharmacy order, broadcast + offers | `pharmacy`, `patient/pharmacy`, `pharmacy/chat`, `ordering/*`, `orders` | broadcast to SA pharmacies, offers in SAR, delivery fee + VAT (`common/quote.ts:5-8`) | pharmacies only in the same market; EGP; Egyptian drug registry codes; price-control rules | broadcast filtered by market; offers carry `{amount_minor,currency}`; price rules per registration |
| 8 | Prescription upload / e-Rx | `prescriptions`, `medical-orders`, `pharmacy/prescription-intakes` | SA formats | local Rx rules, controlled-substance lists | rules per market |
| 9 | Lab order | `labs`, `lab-results` | `labs.service.ts:213` currency SAR | local tests/codes (LOINC global, local registry) | catalogue concept + registration |
| 10 | Radiology | `radiology`, `radiology/provider` (`radiology.service.ts:632,1028`) | SAR, Sunday-Saturday slots | local weekend | MarketConfig weekend |
| 11 | Home nursing | `home-care`, `nursing`, `nursing-services`, `provider/nursing` | SAR, `schemas/home-care.schema.ts:25` services | local service list + nurse licence | catalogue + licence |
| 12 | Pay | `payments`, `payments/webhook`, `moyasar` | Moyasar / mada, one gateway per deployment (`payments.module.ts:64,238`) | other gateway/methods | payment plugin per market; method list from market |
| 13 | Invoice / receipt | `billing` (`billing.module.ts:2,35`, `invoice-pdf.ts:66`) | ZATCA TLV QR, VAT 15 | local e-invoice/receipt, VAT 14 | tax plugin; invoice templates per market |
| 14 | Cancel / refund | `refunds`, `refund-policy`, `admin/refunds`, `operations-safety` (`cancellation_penalties`) | halalas refunds to original method | refund to the same gateway/currency | refund in original currency; policy per market |
| 15 | Wallet / loyalty / referral | `wallets`, `loyalty`, `referral` (`schemas/wallet.schema.ts:8,36`) | single SAR wallet | one wallet per currency or none | per-currency ledger (step 7) |
| 16 | Insurance | `insurance`, `users/me/insurance`, `insurance-engine` | SA insurers, national ID | local insurers | market catalogue |
| 17 | Medical reports / sick leave | `medical-reports`, `sick-leave` (`sick-leave.dto.ts:20`, `sick-leave-pdf.ts:40,63`) | iqama/ID 10 digits, Riyadh time, SA authority wording | different document format and authority | document template per market |
| 18 | Support | `support`, `support/chat` | Arabic, SA contacts | local hours/contacts | branding/support config per market |
| 19 | Emergency | `emergency` (`emergency.service.ts:11`) | 997; shares location with contacts | local numbers | MarketConfig |
| 20 | Notifications | `push`, `mail`, `notifications` | FCM/APNs/WebPush, Resend/Brevo/Mailjet/SMTP | same transports; templates localized | templates per market+locale |

## Provider onboarding (per provider type)
Evidence: `provider-onboarding/provider-onboarding.dto.ts:151,155`, `provider-onboarding.module.ts:136,349-350`, `provider/schemas/index.ts:9-99` (account, profile, documents, bank account), `provider-app/src/screens/doctor/DoctorRegistration.tsx:38`, `screens/nursing/NursingRegistration.tsx:53`.
| type | SA fields today | EG fields (unverified) | Change |
|---|---|---|---|
| Doctor | SCFHS number + expiry, national ID/iqama, IBAN, specialty, gender | Syndicate card, national ID (14), bank account/IBAN, specialty (board) | field set + document types per (market, type); licence per jurisdiction |
| Nurse | SCFHS number/expiry, national ID | Nursing syndicate | same |
| Pharmacy | CR number, MoH licence (`provider-onboarding.dto.ts:151,155`), pharmacist SCFHS | Commercial register, tax card, pharmacy licence, pharmacist syndicate | same |
| Lab / Radiology | CR, MoH licence | CR, tax card, MoH/regulator facility licence | same |
| Hospital / facility | CR, MoH licence, branches with city/district (`schemas/provider-branch.schema.ts:7`) | + governorate | address template |
| Bank / payout | IBAN (Saudi) in `provider_bank_accounts` | EG IBAN or wallet/instapay [unverified] | payout plugin per market |
| Contract | agreement PDF in Arabic, class A/B by type (`contract-pdf.service.ts:55,72`) | operator is the local partner (different legal entity) | agreement per operator + market |
| Approval | admin verifies documents (owner 2026-11-17, SCFHS API not used) | same process | admin work queue scoped by market |
| Expiry | LICENCE-EXPIRY-OPTIONS: end of expiry day Riyadh time, all five types blocked | timezone + rules per jurisdiction | expiry evaluated in jurisdiction timezone |

## Admin
- RBAC is global (`modules/admin/authority/admin-authority.module.ts:21`): needs market-scoped roles (a Cairo operator admin must not see SA patients).
- Finance reports, commissions, payouts (`finance-engine`, `payouts`, `admin/finance*`) assume one currency and one VAT (`finance-engine.module.ts:61,1374`).
- Catalogue admin (`catalogs`, `admin/pharmacy/*`) edits one global set.
- Config forms: `vat_percent` (`admin-finance.dto.ts:15`).
- Audit log (`schemas/audit-log.schema.ts:25`) needs `market_id` and actor scope.
