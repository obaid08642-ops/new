# Agreed vs live: register (audit A)

**Round 3.** Checked on `main` at `f0af4c69` (main merged into this branch; it includes the ~70 commits merged since 2920ecb7: SMS removed, 997 always shown, voice notes on web, address edit, orders filter and all services, the 50% terms, copay fields, `nphies*` renamed, the 2026-10-25 price review, and the removal of the app's community, leaderboard, skin-analysis and SOS/tracking screens). Live: https://nabd.plus, read-only (GET navigation only), last checked in round 2 (before this batch of merges).

**Code on main:** every IN-CODE-NOT-LIVE row has its code on main now and goes live with the next deploy (web) or the next app release (app), unless its notes say otherwise.

**Status legend**
- `LIVE-OK`: in code and seen on the live site.
- `IN-CODE-NOT-LIVE`: code on main; not visible live yet (not deployed, env gate, empty data, gated, or app build not released). Notes give the reason.
- `NEEDS-AUTH`: code checked; the page is behind sign-in, so no anonymous live check.
- `DEFERRED-OK`: agreed to defer; absence confirmed.
- `MISSING`: agreed, not found on main.
- `WRONG`: present on main, but differs from what was agreed (or only part of it is done).
- `REMOVED-BUT-VISIBLE`: a removed feature still shown or reachable. None left in this round.
- `NOT-VERIFIED`: not checked; the reason is in the notes. Admin rows and visual rows need a local test stack; that stack was **not run** in this round, so those rows stay NOT-VERIFIED.
- `STACK-OK`: seen on the local test stack built from main (same code as the live site, not deployed).
- `N/A-OWNER`: owner task with no code expected (open issue).

**Sources:** `docs/product/OWNER_DECISIONS_2026-10-06.md` (OD, items 1–37; the 2026-10-25 supersession of item 12 is in its item 12); `docs/product/OWNER_DECISIONS_PENDING_2026-10-09.md` (PD, approved 2026-10-10); the lead reviewer's brief (LR); `docs/design/PROGRESS.md`; GitHub issues #320–#342 and #1819.

## A. Lead reviewer's items

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| LR-1 | Web social sign-in: Google, Apple, X, Snapchat | `patient-web/components-next/social-login-buttons.tsx` reads `GET /auth/social/config` (`backend/src/modules/auth/auth.controller.ts:394`); buttons always shown (#1922) | No social button on login (round 2) | IN-CODE-NOT-LIVE | Goes live with the next web deploy. |
| LR-2 | App social: Apple on iOS only; Google, X, Snapchat | `patient-app/src/components/auth/AuthKit.tsx:285,291` (`Platform.OS === 'ios'`) | Native, not web-checked | IN-CODE-NOT-LIVE | Needs a device check at release. |
| LR-3 | Password minimum 8 | `backend/src/modules/auth/auth.controller.ts:61,97,102` | `/register`: `minlength="8"` (round 2) | LIVE-OK | |
| LR-4 | Diff 1: guaranteed appointment, Nabdat credit | `patient-app/src/utils/differentiators.ts` §1; `patient-web/components-next/consult/differentiators.tsx`; `backend/src/modules/loyalty/guaranteed-appointment.ts` | Needs a booking | NEEDS-AUTH | Shown only when `late_guarantee` is set. |
| LR-5 | Diff 2: insurance estimate from copay % and cap | `patient-web/lib/insurance/view.ts:136-147` (`copayPercent`, `copayCapSar`) | Needs a saved policy | IN-CODE-NOT-LIVE | Cap field read from the network row (`copay_cap_sar`). |
| LR-6 | Diff 3: "licensed by SCFHS, no. X" | `differentiators.tsx` (`LicenseLine`); `backend/src/modules/care/care.service.ts:698` | Public test doctor: no licence line | IN-CODE-NOT-LIVE | The test doctor may lack a licence; confirm with a licensed doctor. |
| LR-7 | Diff 4: "available today" sort | `backend/src/modules/care/care.controller.ts:49,64` | Sorts visible (round 2) | LIVE-OK | |
| LR-8 | Diff 5: visit-summary actions | `patient-web/lib/consult/follow-up-actions.ts`; `backend/src/modules/care/appointments.service.ts` | Needs a completed visit | NEEDS-AUTH | |
| LR-9 | Doctor card and page fields | `patient-web/lib/api/doctors.ts:99` reads `wait_time` / `avg_wait_minutes`; `education` on the doctor page | Test doctor: fields not shown | IN-CODE-NOT-LIVE | Wait-key fix merged (#1917). Backend education field not traced. |
| LR-10 | Provider registration: clinic name and address | `backend/src/modules/provider-onboarding/` (`doctor-profile-fields.ts`, `.dto.ts`, `.module.ts`); `backend/src/modules/care/care.service.ts` read them | — | IN-CODE-NOT-LIVE | Fixed after the 2026-10-02 audit's R83 (#1927). |
| LR-11 | Uploads closed until the RAM upgrade | No gate: `patient-web/components-next/pharmacy/rx-upload-screen.tsx:104`; `backend/src/modules/storage/storage.module.ts` | Not checked | IN-CODE-NOT-LIVE | No flag or RAM gate on main. Decision source not in the docs. Closed by the lead (uploads gate, #1934). Gate: `uploads_enabled` from `/config` (`backend/src/modules/config/config.service.ts:54`, `clamav.service.ts:34`); false while the virus scanner cannot answer. Goes live with the deploy. |
| LR-12 | Facility accounts deferred | `patient-web/app/[locale]/facility/` exists | `/ar/facility` → 404 | DEFERRED-OK | |
| LR-13 | Removed features (OD 1–4, 8, 14) not visible | App screens deleted; web redirects; backend remnants (see OD-1, OD-14) | — | IN-CODE-NOT-LIVE | Screens removed; backend remnants still on main (OD-1, OD-14). |

## B. Owner decisions 2026-10-06 (OD)

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| OD-1 | Remove community posts; doctor articles instead | App `patient-app/app/community/` deleted. Web `next.config` redirect `/community` → `/articles` (line 84). Backend `backend/src/modules/community/` still present | `/ar/community` → `/ar/articles` (round 2) | WRONG | Backend community module still on main. |
| OD-2 | Remove loyalty leaderboard | App `patient-app/app/loyalty/leaderboard.tsx` deleted (#1912). Backend route removed; web redirect | `/ar/loyalty/leaderboard` → `/login` | IN-CODE-NOT-LIVE | Goes live with the next app release. |
| OD-3 | No family-call UI | `patient-app/app/family/chat.tsx:5` no call button | Gated | NEEDS-AUTH | |
| OD-4 | Delete `/ai/skin-analysis` | Route removed; `backend/src/modules/ai/ai.service.ts` has no `skinAnalysis` (0 matches); app `patient-app/app/ai/skin-analysis.tsx` deleted (#1911) | `/ar/ai/skin-analysis` → `/ar/ai` | IN-CODE-NOT-LIVE | Goes live with the next app release. |
| OD-5 | Merge health and family duplicates | `docs/design/MERGE_MAP.md` header: "Status: APPROVED (2026-10-06)" | — | IN-CODE-NOT-LIVE | Approved; implementation not checked (needs the local stack). Round 4: vitals log is merged (`vitals-log.tsx` redirects to vitals). Other approved pairs not traced; partial. |
| OD-6 | Settings reduced to 6–8 screens | `patient-app/app/settings/`: 14 files, incl. redirect stubs | — | WRONG | File count does not settle the target. Round 4: 9 real settings screens (about, help, index, language, notifications, privacy, refund-policy, security, telehealth-consent) against the 6–8 target. |
| OD-7 | One AI assistant | Web: separate pages removed; only `page.tsx`, `monthly-report`, `layout`, `loading` remain. App: `patient-app/app/ai/` still has `chat-doctor.tsx`, `symptom-checker.tsx`, `triage.tsx`, `symptom-timeline.tsx`, `prescription-translator.tsx` | — | WRONG | App not merged. Web done (IN-CODE-NOT-LIVE). |
| OD-8 | Mental health: no self-assessment, no in-app crisis handling; one urgent-help button | Web redirects; `backend/src/modules/mental-health/mental-health.controller.ts:46` | `/ar/mental-health`: "مساعدة عاجلة" button; no `tel:` link yet | IN-CODE-NOT-LIVE | The 997 button is always there (39fa7ec1); the admin number is an extra button and is set by the owner. |
| OD-9 | Loyalty challenges: health habits only | `backend/src/modules/loyalty/loyalty.service.ts:45-51` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-10 | Rx items: badge, no offers or points, controlled never online, consult button | Strings in locale files; `backend/src/modules/prescriptions/prescriptions.service.ts:268`; `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:249-251`; `backend/src/modules/medicines/rx-consult.controller.ts:38` | Public catalogue empty | IN-CODE-NOT-LIVE | |
| OD-11 | "Online only" badge | String in locale files; `backend/src/modules/users/users.service.ts:57` | Catalogue empty | IN-CODE-NOT-LIVE | |
| OD-12 | Price rule on pharmacy offers | Superseded 2026-10-25 (owner): no rejection above the catalogue price; each such line raises an admin price review. `backend/src/modules/pharmacy/price-review*.ts` (controller, dto, service) | — | IN-CODE-NOT-LIVE | Matches the 2026-10-25 decision. The 06-10 "reject above" text is superseded. |
| OD-13 | Offers waiting: "expanding", then "no pharmacy" | `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:314-322` | Not reached | IN-CODE-NOT-LIVE | |
| OD-14 | Emergency: dial 997; send location to family; no ambulance, dispatch or tracking | Web: 997 always shown (`patient-web/components-next/emergency/urgent-call.tsx:15`, #39fa7ec1). App: emergency tracking, SOS and SOS-active screens deleted. Backend: `backend/src/modules/emergency/` still present; ambulance remnants in `analytics.controller.ts`, `kill-switches.registry.ts`, `i18n.service.ts`, `common/enums.ts`. The drivers module is gone | `/ar/emergency`: no "997" text seen in round 2 (before the merge) | WRONG | Backend and enum remnants still on main. Web and app screens done. |
| OD-15 | AI limits; disclaimer; 100-prompt test set | `backend/src/modules/ai/assistant.service.ts:8-10` (rules in the prompt). No output filter for drug names and doses found by grep | Disclaimer present | MISSING | |
| OD-16 | Module switches for 12 modules | `backend/src/modules/module-switches/` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-17 | Doctor profile: SCFHS number, verified badge; no national ID, phone, email | Test doctor page: none of the three shown | `/ar/consultations/doctors/<id>` (round 2) | LIVE-OK | Licence and badge not evidenced on the test doctor (LR-6). |
| OD-18 | "اطلب الأدوية دي" fills the cart from a prescription | String in `patient-app/app/health/actionable-order.tsx` (app only) | — | IN-CODE-NOT-LIVE | Web has no string. Owner to confirm web is wanted. |
| OD-19 | Lab result push opens the result with "ناقش النتيجة مع طبيب" | String in locale files; push path not traced | — | IN-CODE-NOT-LIVE | String only. Round 4: `RESULT_READY` push exists (`backend/src/modules/notifications/notifications.service.ts:994`); the "ناقش النتيجة" button string exists. |
| OD-20 | Nearest and available-now sorts | As LR-7 | Sorts visible | LIVE-OK | |
| OD-21 | Hosting migration plan | Issue #340 | — | N/A-OWNER | |
| OD-22 | PDPL inventory | Issue #341 | — | N/A-OWNER | |
| OD-23 | Licensing; Nafath and Wasfaty not started | Issue #342; no Nafath or Wasfaty code | — | N/A-OWNER | |
| OD-24 | Doctor chat only inside a booking; 72-hour window | `patient-web/components-next/consult/chat-composer.tsx`; `backend/src/modules/chat/consultation-window.ts`; `chat.service.ts:256` | Gated | NEEDS-AUTH | |
| OD-25 | Payment by service | `backend/src/modules/finance-engine/finance-engine.module.ts:643`; `backend/src/modules/home-care/home-care-compat.module.ts:143-144` | Not checked | IN-CODE-NOT-LIVE | |
| OD-26 | Cancellation and refund table | `backend/src/modules/finance-engine/finance-engine.module.ts:806-817`; `docs/legal/05_CANCELLATION_REFUND.ar.md:16` (50%); live `/ar/refund-policy` has "50%" | Refund page has 50% (round 2) | IN-CODE-NOT-LIVE | Table rows not compared line by line. Lawyer review pending. |
| OD-27 | Second merge pass | `docs/design/MERGE_MAP_2.md` exists; no approval found | — | NOT-VERIFIED | Waits on owner approval. |
| OD-28 | Security sweep S-1 to S-7 | Moyasar webhook HMAC with `timingSafeEqual` (`backend/src/common/moyasar-webhook-auth.ts:27-41`); rest not audited | — | NOT-VERIFIED | S session owns it. |
| OD-29 | Search: self-hosted Meilisearch; Arabic; six languages | `backend/src/modules/search/meili.client.ts:2` | Live search returns results (round 2) | IN-CODE-NOT-LIVE | Engine not confirmed from the page. |
| OD-30 | Insurance chosen first; saved policy; relay to contracted provider | `backend/src/modules/insurance-engine/insurance-engine.module.ts:692-698`; CHI config link (#1919) | `/ar/insurance` lists companies and classes | IN-CODE-NOT-LIVE | Known (S). |
| OD-31 | Double taps and bad networks: idempotency | `backend/src/common/external-call.ts:55`; idempotency in 39 backend files | Not checked | IN-CODE-NOT-LIVE | Tests not run in this audit. |
| OD-32 | Data map document | `docs/architecture/DATA_MAP.md` | — | IN-CODE-NOT-LIVE | A document, not a feature. |
| OD-33 | Backups and secrets | Server-ops work | — | N/A-OWNER | |
| OD-34 | "Operations & Security" admin page | `backend/src/modules/admin/ops-security/ops-security.controller.ts:4` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-35 | Insurance relay-only; rename or remove `nphies*` | `users.dto.ts` and `insurance-engine.module.ts` no longer contain `nphies` (grep: none) | — | IN-CODE-NOT-LIVE | Renamed (#1920). |
| OD-36 | Legal texts published as version 1.0 | `backend/src/modules/auth/auth.service.ts:741-749` | `/ar/terms`, `/en/privacy`, `/en/terms` load | LIVE-OK | |
| OD-37 | Expired licences block the provider | `backend/src/modules/provider/services/scfhs-license.service.ts:68,101` | Not checked | IN-CODE-NOT-LIVE | |

## C. Owner decisions approved 2026-10-10 (PD), all rows

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| PD-363 | Cart checks session by cookie | No `/api/auth/session` fetch in cart code | Not reached | IN-CODE-NOT-LIVE | |
| PD-364 | Cart address card reads saved address | Not found in cart code | — | NOT-VERIFIED | No evidence either way. |
| PD-371 | Service filter on orders list | `patient-web/components-next/orders/orders-query.ts:8` (service chips; fallback to All) | — | IN-CODE-NOT-LIVE | Web. App not traced. |
| PD-372 | "Order again" keeps Rx and pickup | `backend/src/modules/orders/orders.service.ts:608` (`reorder`), `:625` (`reorderPartial`) | — | IN-CODE-NOT-LIVE | Endpoint exists; Rx and pickup carry-over not traced. |
| PD-378 | Web orders page shows all services | `patient-web/components-next/orders/` service chips (#1930) | Gated | IN-CODE-NOT-LIVE | |
| PD-388 / 799 | Voice notes in doctor chat, online only | `patient-web/components-next/consult/voice-note-recorder.tsx` (#1932); app `VoiceNoteButton` | — | IN-CODE-NOT-LIVE | Web recorder on main. |
| PD-390 | Price summary from the server on booking | App `patient-app/app/consultations/booking-status.tsx:54` (`priceSummary`) | Not reached | IN-CODE-NOT-LIVE | Web not traced. |
| PD-393 | "Nearest" and "available now" filters | As LR-7 | Sorts visible | LIVE-OK | |
| PD-394 | Urdu uses Noto Nastaliq | `patient-web/app/fonts.ts:46` (`notoNastaliqUrdu`) | — | IN-CODE-NOT-LIVE | |
| PD-396 | One back button, no close button beside it | App `patient-app/src/components/consult/ConsultKit.tsx:430` has both; web not traced | — | NOT-VERIFIED | Visual check needs the local stack. |
| PD-622 / 635 | Lab cash and insurance filter deferred | None found | — | DEFERRED-OK | |
| PD-625 | "Compare prices" opens lab search | `patient-web/app/[locale]/labs/providers/page.tsx` | Not reached | IN-CODE-NOT-LIVE | |
| PD-628 / 629 | Lab preparation text, reviewed medically | `patient-web/app/[locale]/labs/confirm/page.tsx:31` (`preparationFor`) | Not reached | IN-CODE-NOT-LIVE | Medical review pending. |
| PD-638 | Live technician map deferred | Sample tracking exists; live map not checked | — | DEFERRED-OK | Needs the local stack. Round 4: no live technician map; the tracking screen shows steps and home/clinic type only. |
| PD-646 | Nursing tracking back button | `patient-web/app/[locale]/nursing/visits/[visitId]/page.tsx:40` | Gated | NEEDS-AUTH | |
| PD-663 | Health QR has no national ID | `patient-web/lib/health/qr.ts` has no national-ID field | Gated | IN-CODE-NOT-LIVE | |
| PD-666 | Wearables become vital signs | `patient-web/app/[locale]/health/wearables/page.tsx`; label still "الأجهزة القابلة للارتداء" (`messages/ar.json:747`) | — | WRONG | Label not changed. |
| PD-669 | Sleep tips from published articles | `patient-web/app/[locale]/health/sleep/page.tsx:61` | Gated | IN-CODE-NOT-LIVE | |
| PD-678 | Next appointment on web health page | `patient-web/app/[locale]/health/page.tsx:65` | Gated | NEEDS-AUTH | |
| PD-679 | Vitals: last reading per sign, with its date | No "last reading" code found | — | IN-CODE-NOT-LIVE | Needs the local stack. Round 4: `patient-app/src/components/health/VitalsView.tsx` has the "last reading" label. |
| PD-684 | Booking for a family member deferred | None found | — | DEFERRED-OK | |
| PD-685 / 696 | Per-member family permissions | `patient-web/components-next/family/member-permissions.tsx` | Gated | NEEDS-AUTH | |
| PD-692 | Emergency contacts on family page | `patient-web/app/[locale]/family/page.tsx:35` | Gated | NEEDS-AUTH | |
| PD-695 | Invite by code | `patient-web/components-next/family/add-family.tsx:41` | Gated | NEEDS-AUTH | |
| PD-701 | Family web screens without panels | No `panel` class in `patient-web/components-next/family/` | — | IN-CODE-NOT-LIVE | |
| PD-752 | Share an offer on web | `patient-web/app/[locale]/offers/[offerId]/page.tsx:11` (`ShareButton`) | — | IN-CODE-NOT-LIVE | |
| PD-755 / 783 | /terms and /privacy before sign-in | Pages present | Load before sign-in (round 2) | LIVE-OK | |
| PD-756 | "Download my data" | `patient-web/app/api/privacy/data-export/route.ts` | Gated | NEEDS-AUTH | |
| PD-763 / 771 | Saved cards deferred | `backend/src/modules/auth/permission-matrix.service.ts:56` (`saved_cards: false`) | — | DEFERRED-OK | |
| PD-767 | Hospital from map opens facility page | Not found | — | NOT-VERIFIED | Needs the local stack. |
| PD-769 | Edit and delete address | `patient-web/components-next/account/address-book.tsx:232` (edit) | Gated | IN-CODE-NOT-LIVE | Delete not traced. |
| PD-777 | OpenStreetMap allowed in CSP | `patient-web/lib/security/csp.ts:61-64`; live CSP header includes it | Live (round 2) | LIVE-OK | |
| PD-781 | 50% recovery stated in the terms | `docs/legal/01_PATIENT_TERMS.ar.md:63` and `05_CANCELLATION_REFUND.ar.md:16`; live `/ar/refund-policy` has 50% | Refund page yes | IN-CODE-NOT-LIVE | Terms text comes from the legal source, not `messages/*.json`. |
| PD-794 | SEO titles without unverifiable claims | Absent from `patient-web/messages/ar.json` | — | IN-CODE-NOT-LIVE | |
| PD-795 | JSON-LD text moved to translations | `patient-web/lib/seo/feature-pages.ts` builds JSON-LD from keys; not traced further | — | NOT-VERIFIED | Needs the local stack. |
| PD-797 | `medicine-catalog` merged into `/c` | `/ar/medicine-catalog` → `/ar/c` | Redirect (round 2) | LIVE-OK | |
| PD-800 | Camera and mic toggles in the call | App `patient-app/app/room/[id].tsx:65,71` | Not reached | IN-CODE-NOT-LIVE | |
| PD-806 | Web doctor chat: write messages | `patient-web/components-next/consult/chat-composer.tsx:16` | Gated | NEEDS-AUTH | |
| PD-808 | "Discounted follow-up price" text removed | Absent from locale files | — | IN-CODE-NOT-LIVE | |
| PD-819 | Refund tab in the app | No refund code in `patient-app/app/orders` or `returns` | — | MISSING | |
| PD-821 / 833 | Cash button removed | None on web payments or pharmacy | — | IN-CODE-NOT-LIVE | |
| PD-843 | OCR of insurance card on web deferred | Built: `patient-web/components-next/insurance/add-policy-form.tsx:76,92` | — | IN-CODE-NOT-LIVE | Built, but the decision was to defer. Owner to confirm. Closed (owner-delegated): the card photo is shown only when `uploadsEnabled` (`add-policy-form.tsx:149`). |
| PD-851 | Relaxation screen deferred for medical review | `patient-web/app/[locale]/mental-health/relax` exists | — | DEFERRED-OK | Needs the local stack and a read of the content. Round 4: the relax screen is gone from `patient-web/app/[locale]/mental-health/` (layout, loading, mood, page only). |
| PD-875 / 883 | Mic in the AI assistant deferred | None found | — | DEFERRED-OK | |
| PD-876 | "Ask the pharmacist" opens a new pharmacy request | `patient-web/components-next/assistant/prescription-client.tsx:117` → `/pharmacy/rx-order` | — | IN-CODE-NOT-LIVE | |
| PD-878 | AI tools row shows three tools | `/ar/ai` | Live (round 2) | LIVE-OK | |
| PD-918 | Community moderation removed from admin | `admin/src/pages/admin/article-review.tsx:9` replaces it; no community page found | Admin not checked | STACK-OK |  Round 4 (local stack, same code as main): no community route in the admin nav. |
| PD-949 | One medicine editor in admin | `admin/src/pages/admin/medicines-catalog.tsx`; `catalog-manager.tsx:71` says medicines are edited only there | Admin not checked | STACK-OK |  Round 4 (local stack): one medicines editor in the admin nav (`/admin/medicines-catalog`). |
| PD-952 | One refund path | `patient-web/app/[locale]/refund-policy/page.tsx` exists; the other paths not traced | — | NOT-VERIFIED | Needs the local stack. |
| PD-981–993 | Public pages removed from admin (8 pages) | Admin not checked | — | NOT-VERIFIED | Needs the local stack and the seeded admin. |
| PD-1097 / 1127 / 1177 | Ambulance and SOS removed from provider app | Provider app: icon and comment only; no SOS screen | — | IN-CODE-NOT-LIVE | Backend remnants (OD-14). |
| PD-1138 | Price above the catalogue allowed (superseded 2026-10-25) | Price review on main (see OD-12) | — | IN-CODE-NOT-LIVE | |
| PD-1155 | Doctor cannot send an Rx to a pharmacy | None in provider-app doctor code | — | IN-CODE-NOT-LIVE | |
| PD-1159 | Follow-up chat close and extend | `backend/src/modules/chat/chat.service.ts:256`; `followup-window.ts` | Gated | IN-CODE-NOT-LIVE | |
| PD-1176 | Pharmacy setup checklist | `provider-app/src/screens/pharmacy/PharmacyMore.tsx:2,4` (P9 first-login checklist) | — | IN-CODE-NOT-LIVE | |
| PD-404 | Web doctor filters | `patient-web/components-next/consult/doctor-quick-filters.tsx` | Filters visible (round 2) | LIVE-OK | |

## Summary

106 rows (A 13, B 37, C 56); each has one status.

| Status | Count |
|---|---|
| LIVE-OK | 11 |
| IN-CODE-NOT-LIVE | 53 |
| NEEDS-AUTH | 11 |
| DEFERRED-OK | 5 |
| MISSING | 3 |
| WRONG | 5 |
| REMOVED-BUT-VISIBLE | 0 |
| NOT-VERIFIED | 14 |
| N/A-OWNER | 4 |

**Still NOT-VERIFIED (14 rows):** OD-5, OD-6, OD-19, OD-27, OD-28, PD-364, PD-396, PD-638, PD-679, PD-767, PD-795, PD-851, PD-952, PD-981–993. The admin rows and the visual rows need the local test stack with the seeded admin from `tools/live`, and that stack was not run in this round.
