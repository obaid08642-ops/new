# Agreed vs live: register (audit A)

**Round 2.** The first round checked `main` at e6bbf833. This round is checked on `main` at 2920ecb7 (merged into this branch as d6f5f39a, which includes #1890–#1909). Live: https://nabd.plus, read-only (GET navigation only; no sign-up, order, booking or payment), `/ar` and `/en`, widths 390 and 1280.

**Code on main:** every IN-CODE-NOT-LIVE row below has its code on main now. It goes live with the next deploy, unless its Notes say otherwise.

**Status legend**
- `LIVE-OK`: in code and seen on the live site.
- `IN-CODE-NOT-LIVE`: code on main; not visible live (env gate, build not deployed, empty data, or not reached). Notes give the reason.
- `NEEDS-AUTH`: code checked; the page is behind sign-in, so the live check was not possible for an anonymous visitor.
- `DEFERRED-OK`: agreed to defer; absence confirmed in code and/or live.
- `MISSING`: agreed, not found in code or live.
- `WRONG`: present, but differs from what was agreed.
- `REMOVED-BUT-VISIBLE`: a removed feature still shown or still reachable.
- `NOT-VERIFIED`: no evidence could be obtained in this round. The reason is in the notes. Not counted as a finding.
- `N/A-OWNER`: owner task with no code expected (tracked in an open issue).

**Sources:** `docs/product/OWNER_DECISIONS_2026-10-06.md` (OD, items 1–37); `docs/product/OWNER_DECISIONS_PENDING_2026-10-09.md` (PD, the row number; approved by the owner on 2026-10-10); the lead reviewer's brief (LR); `docs/design/PROGRESS.md`; GitHub issues #320–#342 and #1819.

## A. Lead reviewer's items

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| LR-1 | Web social sign-in: Google, Apple, X, Snapchat | `patient-web/components-next/social-login-buttons.tsx` now reads `GET /auth/social/config` (`backend/src/modules/auth/auth.controller.ts:394`, #1903) | Login (ar/en, 390/1280): no social button | IN-CODE-NOT-LIVE | Goes live with the next deploy. Each provider is shown when the backend config has its client id. Known (S). |
| LR-2 | App social: Apple on iOS only; Google, X, Snapchat | `patient-app/src/components/auth/AuthKit.tsx:285,291` (`Platform.OS === 'ios'`) | Native app, not web-checked | IN-CODE-NOT-LIVE | Native build; needs a device check at release. |
| LR-3 | Password minimum 8 | `backend/src/modules/auth/auth.controller.ts:61,97,102`; `backend/src/common/password-security.service.ts:22` | `/register`: password `minlength="8"` in ar and en, both widths | LIVE-OK | |
| LR-4 | Diff 1: guaranteed appointment, small Nabdat credit | `patient-app/src/utils/differentiators.ts` §1; `patient-web/components-next/consult/differentiators.tsx` (`GuaranteeLine`); `backend/src/modules/loyalty/guaranteed-appointment.ts` | Needs a booking | NEEDS-AUTH | Shown only when `late_guarantee` is set in `/system-config/public`. |
| LR-5 | Diff 2: insurance estimate from copay % and cap | `patient-web/lib/insurance/copay.ts`; `patient-app/src/utils/insurance-copay-contract.ts` | Needs a saved policy | NEEDS-AUTH | |
| LR-6 | Diff 3: licence line "licensed by SCFHS, no. X" | `differentiators.tsx` (`LicenseLine`); `backend/src/modules/care/care.service.ts:698` | Public test doctor page: no licence line | IN-CODE-NOT-LIVE | The one public doctor is a test record and may have no licence. Confirm with a licensed doctor. |
| LR-7 | Diff 4: "available today" sort | `backend/src/modules/care/care.controller.ts:49,64` | `/ar/consultations/doctors`: "متاح اليوم", "الأقرب", "متاح الآن" | LIVE-OK | |
| LR-8 | Diff 5: visit-summary actions | `patient-web/lib/consult/follow-up-actions.ts`; `backend/src/modules/care/appointments.service.ts` | Needs a completed visit | NEEDS-AUTH | |
| LR-9 | Doctor card and page fields | `patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx` draws `education` and `wait_time` | Test doctor page: neither shown | WRONG | Backend does not send the fields yet (#1819). |
| LR-10 | Provider registration fields | Audit: clinic name and address are required at step 3 but not read by the backend (`docs/review/AUDIT_2026-10-02.md:69`, R83) | — | WRONG | From the 2026-10-02 audit; not re-checked here. |
| LR-11 | Uploads closed until the RAM upgrade | No gate: `patient-web/components-next/pharmacy/rx-upload-screen.tsx:104` posts to `/api/patient/prescriptions/upload`; `backend/src/modules/storage/storage.module.ts` has no flag | Not checked (auth) | MISSING | No flag, RAM or upload gate found on main. The decision source is not in the docs. |
| LR-12 | Facility accounts deferred | `patient-web/app/[locale]/facility/` exists; the page serves 404 | `/ar/facility` → 404 | DEFERRED-OK | |
| LR-13 | Removed features (OD 1–4, 8, 14) not visible | See section B | See section B | REMOVED-BUT-VISIBLE | |

## B. Owner decisions 2026-10-06 (OD)

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| OD-1 | Remove community posts; doctor articles instead | Web: `next.config` redirect `/community` → `/articles` (line 84); the web page is deleted. App: `patient-app/app/community/hub.tsx` still present. Backend: `backend/src/modules/community/` still present | `/ar/community` → `/ar/articles` | REMOVED-BUT-VISIBLE | Web is fine. The app screen and backend module remain. |
| OD-2 | Remove loyalty leaderboard | Web: page redirects. Backend route removed (`loyalty-leaderboard-removed.spec.ts`). App: `patient-app/app/loyalty/leaderboard.tsx` still present | `/ar/loyalty/leaderboard` → `/login` (gated) | REMOVED-BUT-VISIBLE | App screen still shipped. |
| OD-3 | No family-call UI | `patient-app/app/family/chat.tsx:5`: no call button; web `family/chat/page.tsx:10` | `/family` → `/login` (gated) | NEEDS-AUTH | Code confirms no call button. |
| OD-4 | Delete `/ai/skin-analysis` | Route removed in `ai.controller.ts`. Method left at `ai.service.ts:269`. Web: redirect. App: `patient-app/app/ai/skin-analysis.tsx` present | `/ar/ai/skin-analysis` → `/ar/ai` | REMOVED-BUT-VISIBLE | App screen remains; the service method is dead code. |
| OD-5 | Merge health and family duplicates | `docs/design/MERGE_MAP.md`: "Status: APPROVED (2026-10-06)" | — | NOT-VERIFIED | Map approved; implementation not checked in this round. |
| OD-6 | Settings reduced to 6–8 screens | `patient-app/app/settings/`: 14 files (includes redirect stubs) | — | NOT-VERIFIED | The file count does not settle the target. |
| OD-7 | One AI assistant | Web routes still exist as separate pages: `patient-web/app/[locale]/ai/{chat-doctor,symptom-checker,triage,symptom-timeline,prescription-translator,report}`. App: `patient-app/app/ai/*.tsx` | `/ar/ai` shows three tools, separate pages | WRONG | Merge not done on web or app. |
| OD-8 | Mental health: no self-assessment, no crisis handling; one "Need urgent help?" button | Web: self-assessment and crisis routes redirect. `backend/src/modules/mental-health/mental-health.controller.ts:46` | `/ar/mental-health`: "مساعدة عاجلة" button; no `tel:` link | IN-CODE-NOT-LIVE | The number comes from admin config; the owner enters it. No dialer link until then. |
| OD-9 | Loyalty challenges: health habits only | `backend/src/modules/loyalty/loyalty.service.ts:45-51` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-10 | Rx items: badge, no offers or points, controlled never online, consult button | Strings "يحتاج وصفة" in locale files; `backend/src/modules/prescriptions/prescriptions.service.ts:268`; `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:249-251`; "استشر طبيب" in `backend/src/modules/medicines/rx-consult.controller.ts:38` | Public catalogue empty; no product page to check | IN-CODE-NOT-LIVE | Server rule "no discount on Rx" not confirmed by grep. |
| OD-11 | "Online only" badge | String "أونلاين فقط" in locale files; flag mapped at `backend/src/modules/users/users.service.ts:57` | Catalogue empty | IN-CODE-NOT-LIVE | |
| OD-12 | Price ceiling on pharmacy offers | `backend/src/modules/pharmacy/services/pharmacy-offer.service.ts:256`: catalogue price is a reference (the 2026-10-10 amendment) | — | IN-CODE-NOT-LIVE | Matches PD 1138 (approved 2026-10-10). The 06-10 text (reject above the SFDA price) is superseded. Owner to confirm. |
| OD-13 | Offers waiting: "expanding", then "no pharmacy"; never endless | `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:314-322` | Not reached | IN-CODE-NOT-LIVE | |
| OD-14 | Emergency: dial 997; send location to family; no ambulance, dispatch or tracking | Web: `/emergency/tracking` redirects; no "997" in the web emergency page code (only in `messages/*.json`). App: `patient-app/app/emergency/tracking.tsx` still present. Backend: `backend/src/modules/emergency/` still present; ambulance enum in `backend/src/common/enums.ts` | `/ar/emergency` and `/en/emergency`: urgent-help text, no "997", no `tel:` link | WRONG | GitHub #333 is closed as done, but the code is not removed. |
| OD-15 | AI limits: no diagnosis, drug or dose; 100-prompt test set; disclaimer | `backend/src/modules/ai/assistant.service.ts:10` (rules in the prompt). No output filter for drug names and doses found by grep | Disclaimer present on `/ar/ai` | MISSING | Not confirmed beyond grep. |
| OD-16 | Module switches for 12 modules | `backend/src/modules/module-switches/` (controller, middleware, service) | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-17 | Doctor profile: SCFHS number and verified badge; never national ID, phone or email | Test doctor page: no phone, email or national ID text | `/ar/consultations/doctors/<id>`: none of the three shown | LIVE-OK | The licence line and badge are not evidenced on the test doctor (see LR-6). |
| OD-18 | "اطلب الأدوية دي" fills the cart from a prescription | String in `patient-app/app/health/actionable-order.tsx` (app only) | — | IN-CODE-NOT-LIVE | Web has no string. Owner to confirm web is wanted. |
| OD-19 | Lab result push opens the result with "ناقش النتيجة مع طبيب" | String in locale files; push path not traced | — | NOT-VERIFIED | String only; push path not checked. |
| OD-20 | Nearest and available-now sorts | As LR-7 | `/ar/consultations/doctors`: "الأقرب", "متاح الآن" | LIVE-OK | |
| OD-21 | Hosting migration plan | Issue #340 open | — | N/A-OWNER | |
| OD-22 | PDPL inventory and access log | Issue #341 open | — | N/A-OWNER | |
| OD-23 | Licensing; Nafath and Wasfaty not started | Issue #342 open; no Nafath or Wasfaty code found | — | N/A-OWNER | |
| OD-24 | Doctor chat only inside a booking; 72-hour window | `patient-web/components-next/consult/chat-composer.tsx`; `backend/src/modules/chat/consultation-window.ts`; `backend/src/modules/chat/chat.service.ts:256` (one extension) | Not reached (gated) | NEEDS-AUTH | |
| OD-25 | Payment by service: online for consultations, home visits, nursing; cash only for pharmacy under rules | `backend/src/modules/finance-engine/finance-engine.module.ts:643`; `backend/src/modules/home-care/home-care-compat.module.ts:143-144` (rejects cash for home visits) | Not checked | IN-CODE-NOT-LIVE | |
| OD-26 | Cancellation and refund table | `backend/src/modules/finance-engine/finance-engine.module.ts:806-817`. Live `/ar/refund-policy` contains "50%" | Refund page has the 50% clause | IN-CODE-NOT-LIVE | The table rows were not compared line by line. Lawyer review pending. |
| OD-27 | Second merge pass for all sections | `docs/design/MERGE_MAP_2.md` exists; no approval found | — | NOT-VERIFIED | Waits on OD-5 and owner approval. |
| OD-28 | Security sweep S-1 to S-7 | Moyasar webhook HMAC with `timingSafeEqual` at `backend/src/common/moyasar-webhook-auth.ts:27-41`. The rest (S-1 to S-4, S-6, S-7) not audited here | — | NOT-VERIFIED | S session owns it. |
| OD-29 | Search: self-hosted Meilisearch; Arabic normalisation; six languages | `backend/src/modules/search/meili.client.ts:2` | `/ar/search?q=باراسيتامول` returns 10 results | IN-CODE-NOT-LIVE | Live search works. Meilisearch as the engine is not confirmed from the page. |
| OD-30 | Insurance chosen first; saved policy; relay to contracted provider | `backend/src/modules/insurance-engine/insurance-engine.module.ts:692-698` | `/ar/insurance` lists companies and classes | IN-CODE-NOT-LIVE | Known (S): company, class, copay and the CHI link on live. |
| OD-31 | Double taps and bad networks: idempotency | `backend/src/common/external-call.ts:55`; idempotency used in 39 backend files | Not checked | IN-CODE-NOT-LIVE | Tests not run in this audit. |
| OD-32 | Data map document | `docs/architecture/DATA_MAP.md` | — | IN-CODE-NOT-LIVE | A document, not a feature. |
| OD-33 | Backups and secrets after the 2026-10-08 incident | Server-ops work | — | N/A-OWNER | |
| OD-34 | "Operations & Security" admin page | `backend/src/modules/admin/ops-security/ops-security.controller.ts:4` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-35 | Insurance relay-only; rename or remove `nphies*` | `backend/src/modules/users/users.dto.ts:51` (`nphies_eligible`); `backend/src/modules/insurance-engine/insurance-engine.module.ts:347` (comment) | — | WRONG | Names that imply a live insurer check are still in code. |
| OD-36 | Legal texts published as version 1.0 | `backend/src/modules/auth/auth.service.ts:741-749` | `/ar/terms`, `/en/privacy`, `/en/terms` load | LIVE-OK | |
| OD-37 | Expired licences block the provider automatically | `backend/src/modules/provider/services/scfhs-license.service.ts:68,101` | Not checked | IN-CODE-NOT-LIVE | |

## C. Owner decisions approved 2026-10-10 (PD), all rows

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| PD-363 | Cart checks the session by cookie, not `/api/auth/session` | No fetch of `/api/auth/session` in cart code (only the exchange route) | Not reached | IN-CODE-NOT-LIVE | |
| PD-364 | Cart address card reads the saved address | Not found in cart code | — | NOT-VERIFIED | |
| PD-371 | Service filter on the orders list | Not found in web or app orders code | — | MISSING | |
| PD-372 | "Order again" keeps the prescription and pickup if still valid | "reorder" not found in backend orders or pharmacy modules | — | NOT-VERIFIED | Search may have missed a different name. |
| PD-378 | Web orders page shows all services | `patient-web/app/[locale]/orders`: no consultation or appointment entries | Not reached (gated) | WRONG | Orders page is pharmacy-only in code. |
| PD-388 / 799 | Voice notes in the doctor chat, online consultations only | App: `VoiceNoteButton` in `patient-app/app/consultations/chat-with-doctor.tsx:334`. Web: none | — | MISSING | App has it; web does not. |
| PD-390 | Price summary from the server on booking | App: `priceSummary` in `patient-app/app/consultations/booking-status.tsx:54` | Not reached | IN-CODE-NOT-LIVE | Web not checked. |
| PD-393 | "Nearest" and "available now" filters enabled | As LR-7 | Sorts visible | LIVE-OK | |
| PD-394 | Urdu uses Noto Nastaliq | No `Noto Nastaliq` in web app, lib or components | — | MISSING | |
| PD-396 | One back button, no close button beside it | App `ConsultKit.tsx:430` Sheet has both `onClose` and `onBack` | Not checked | NOT-VERIFIED | Needs a visual check. |
| PD-622 / 635 | Lab cash and insurance filter deferred | No lab cash or insurance filter found | — | DEFERRED-OK | |
| PD-625 | "Compare prices" opens the lab search | `patient-web/app/[locale]/labs/providers/page.tsx` (compare) | Not reached | IN-CODE-NOT-LIVE | |
| PD-628 / 629 | Lab preparation text, reviewed medically | `patient-web/app/[locale]/labs/confirm/page.tsx:31` (`preparationFor`) | Not reached | IN-CODE-NOT-LIVE | Medical review pending. |
| PD-638 | Live technician map deferred | `patient-web/components-next/diagnostics-sample-tracking-client.tsx`; app `diagnostics/technician-tracking.tsx` | — | NOT-VERIFIED | Need to read whether the tracking is a live map. |
| PD-646 | Nursing tracking back button as now | `patient-web/app/[locale]/nursing/visits/[visitId]/page.tsx:40` | Gated | NEEDS-AUTH | |
| PD-663 | Health QR has no national ID | `patient-web/components-next/health/passport-qr.tsx`; `patient-web/lib/health/qr` | Gated | NOT-VERIFIED | QR payload not read. |
| PD-666 | Wearables renamed to vitals | `patient-web/app/[locale]/health/wearables/page.tsx` | Gated | NOT-VERIFIED | Label not read. |
| PD-669 | Sleep tips from published articles | `patient-web/app/[locale]/health/sleep/page.tsx:61` | Gated | IN-CODE-NOT-LIVE | |
| PD-678 | Next appointment on the web health page | `patient-web/app/[locale]/health/page.tsx:65` | Gated | NEEDS-AUTH | |
| PD-679 | Vitals: last reading per sign, with its date | No "last reading" code found | — | NOT-VERIFIED | |
| PD-684 | Booking for a family member deferred | No `for_member` or `family_member_id` booking code | — | DEFERRED-OK | |
| PD-685 / 696 | Per-member family permissions | `patient-web/components-next/family/member-permissions.tsx` | Gated | NEEDS-AUTH | |
| PD-692 | Emergency contacts on the family page | `patient-web/app/[locale]/family/page.tsx:35` | Gated | NEEDS-AUTH | |
| PD-695 | Invite by code | `patient-web/components-next/family/add-family.tsx:41` (`invite_code`) | Gated | NEEDS-AUTH | |
| PD-701 | Family web screens without panels | `patient-web/components-next/family/` | — | NOT-VERIFIED | Visual check needed. |
| PD-752 | Share an offer on web | `patient-web/components-next/loyalty/loyalty-actions.tsx:117` (`navigator.share`, loyalty only). No offer share found | — | NOT-VERIFIED | |
| PD-755 / 783 | /terms and /privacy before sign-in | Pages present | `/ar/terms`, `/en/privacy` load before sign-in | LIVE-OK | |
| PD-756 | "Download my data" | `patient-web/app/api/privacy/data-export/route.ts` | Gated | NEEDS-AUTH | Transfer to another platform deferred, as agreed. |
| PD-763 / 771 | Saved cards deferred to the payment gateway | `backend/src/modules/auth/permission-matrix.service.ts:56` (`saved_cards: false`) | — | DEFERRED-OK | |
| PD-767 | Hospital from the map opens the facility page | Not found | — | NOT-VERIFIED | |
| PD-769 | Edit and delete an address | No edit or delete address code in web | — | MISSING | App not checked. |
| PD-777 | OpenStreetMap allowed in CSP | `patient-web/lib/security/csp.ts:61-64` | Live CSP header includes openstreetmap.org | LIVE-OK | |
| PD-781 | 50% recovery stated in the terms | Live `/ar/refund-policy` has "50%". `patient-web/messages/en.json` and `ar.json` have no "50%" | Refund page yes; terms text not checked live | WRONG | Terms wording to be confirmed; lawyer review pending. |
| PD-794 | SEO titles without unverifiable claims | "صيدليات موثقة" and "24 ساعة" absent from `patient-web/messages/ar.json` | — | IN-CODE-NOT-LIVE | |
| PD-795 | JSON-LD text moved to translations | Not verified | — | NOT-VERIFIED | |
| PD-797 | `medicine-catalog` merged into `/c` | `/ar/medicine-catalog` → `/ar/c` | Redirect confirmed | LIVE-OK | |
| PD-800 | Camera and mic toggles in the call | App `patient-app/app/room/[id].tsx:65,71` (`toggleMic`, `toggleCamera`) | Not reached | IN-CODE-NOT-LIVE | Web call screens not checked. |
| PD-806 | Web doctor chat: write messages | `patient-web/components-next/consult/chat-composer.tsx:16` | Gated | NEEDS-AUTH | |
| PD-808 | "Discounted follow-up price" text removed | Absent from locale files | — | IN-CODE-NOT-LIVE | |
| PD-819 | Refund tab in the app | Not found in `patient-app/app/orders` or `returns` | — | NOT-VERIFIED | |
| PD-821 / 833 | Cash button removed | No cash button in web payments or pharmacy code | — | IN-CODE-NOT-LIVE | |
| PD-843 | OCR of the insurance card on web deferred | Built: `patient-web/components-next/insurance/add-policy-form.tsx:76,92` (`/insurance/ocr-extract`) | — | WRONG | Built, but the decision said defer. S owns insurance. |
| PD-851 | Relaxation screen deferred for medical review | `patient-web/app/[locale]/mental-health/relax` still exists | — | NOT-VERIFIED | Content not read. |
| PD-875 / 883 | Mic in the AI assistant deferred | No voice input found in the assistant | — | DEFERRED-OK | |
| PD-876 | "Ask the pharmacist" opens a new pharmacy request | `patient-web/components-next/assistant/prescription-client.tsx:117` → `/pharmacy/rx-order` | — | IN-CODE-NOT-LIVE | |
| PD-878 | AI tools row shows three tools | `/ar/ai` shows three tools | Live | LIVE-OK | |
| PD-918 | Community moderation page removed from admin | Admin `article-review.tsx` (doctor articles) present; no community page found | Admin not checked | NOT-VERIFIED | |
| PD-949 | One medicine editor in admin | `admin/src/components/AdminGuard.tsx:72` lists `medicines-catalog`; other editors not checked | Admin not checked | NOT-VERIFIED | |
| PD-952 | One refund path | `patient-web/app/[locale]/refund-policy/page.tsx` present; other paths not checked | Refund page loads | NOT-VERIFIED | |
| PD-981–993 | Public pages removed from admin (8 pages) | Admin not checked | Admin not checked | NOT-VERIFIED | |
| PD-1097 / 1127 / 1177 | Ambulance and SOS removed from the provider app (#1205) | Provider app: only an icon and a comment; no SOS screen | — | IN-CODE-NOT-LIVE | Backend emergency module remains (OD-14). |
| PD-1138 | Pharmacist may enter a price above the catalogue (amended 2026-10-10) | `pharmacy-offer.service.ts:256` | — | IN-CODE-NOT-LIVE | See OD-12. |
| PD-1155 | Doctor cannot send a prescription to a pharmacy (patient asks) | No such action in provider-app doctor code | — | IN-CODE-NOT-LIVE | Absence confirmed in code. |
| PD-1159 | Follow-up chat close and extend | `backend/src/modules/chat/chat.service.ts:256`; `followup-window.ts` | Gated | IN-CODE-NOT-LIVE | |
| PD-1176 | Pharmacy setup checklist | Not found in provider app | — | NOT-VERIFIED | |
| PD-404 | Web doctor filters: specialty, visit type, cash or insurance | `patient-web/components-next/consult/doctor-quick-filters.tsx` | "الكل", "استشارة فيديو", "زيارة منزلية", "تأمين", "دفع ذاتي" on `/ar/consultations/doctors` | LIVE-OK | |

## Summary

106 rows in sections A, B and C (A: 13, B: 37, C: 56; each row has one status).

| Status | Count |
|---|---|
| LIVE-OK | 11 |
| IN-CODE-NOT-LIVE | 33 |
| NEEDS-AUTH | 12 |
| DEFERRED-OK | 5 |
| MISSING | 6 |
| WRONG | 8 |
| REMOVED-BUT-VISIBLE | 4 |
| NOT-VERIFIED | 23 |
| N/A-OWNER | 4 |

Section C lists every PD row from the decisions doc that has a question in it. PD 376 and 651 are not rows in the doc; they are dropped.
