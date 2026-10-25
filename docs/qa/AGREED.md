# Agreed vs live: register (audit A)

Audit of what the owner and the lead reviewer agreed, checked in `main` (commit `e6bbf833`, 2026-10-25) and on the live site https://nabd.plus (read-only: GET navigation only, no sign-up, order, booking or payment).

**Live check:** `/ar` and `/en`, widths 390 and 1280, 17 public paths (login, register, community, leaderboard, skin analysis, emergency, emergency tracking, mental health, crisis contacts, doctors, family, insurance, articles, terms, privacy, AI, catalogue). Signed-in pages redirect to `/login` for an anonymous visitor, so they are marked NOT-VERIFIED where the check needed a session.

**Status legend**
- `LIVE-OK`: in code and seen on the live site.
- `IN-CODE-NOT-LIVE`: in code; not visible live (env gate, build flag, empty data, auth-gated, or not checked live). The reason is in the notes.
- `MISSING`: agreed, not found in code or live.
- `WRONG`: present, but differs from what was agreed.
- `REMOVED-BUT-VISIBLE`: a removed feature still shown or still reachable.
- `NOT-VERIFIED`: not checked in this audit (no evidence either way). Not counted as a finding.
- `N/A-OWNER`: owner task with no code expected (tracked in an open issue).

**Sources:** `docs/product/OWNER_DECISIONS_2026-10-06.md` (items 1–37, cited "OD"); `docs/product/OWNER_DECISIONS_PENDING_2026-10-09.md` (owner approved the recommendations on 2026-10-10, cited "PD" with its row number); `AGENTS.md` owner lines; the lead reviewer's brief (cited "LR"); `docs/design/PROGRESS.md`; GitHub issues #320–#342 (decision items) and #1819.

Known, do not resend (already with S or Design): social buttons hidden (LR-1); providers map entry point and the jobs and drug index for non-doctor providers (Design); insurance company, class, copay and the CHI link (S, OD-30); districts and the map address picker (S and Design).

## A. Lead reviewer's items

| ID | Agreed | Source | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|---|
| LR-1 | Web social sign-in: Google, Apple, X, Snapchat | LR | `patient-web/components-next/social-login-buttons.tsx:45-48` (each button only with its env var) | Login (ar/en, 390/1280): no social button at all | IN-CODE-NOT-LIVE | Env gate: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, Apple client id + redirect, `NEXT_PUBLIC_SOCIAL_X_SNAPCHAT=1` with X and Snapchat ids. Known (S fixing). |
| LR-2 | App social sign-in: Apple on iOS only, never Android; Google, X, Snapchat everywhere | LR | `patient-app/src/components/auth/AuthKit.tsx:283` (`Platform.OS === 'ios'`) | Native app, not web-checked | NOT-VERIFIED | Code matches the rule. Needs a device check. |
| LR-3 | Password minimum 8 | LR | `backend/src/modules/auth/auth.controller.ts:61,97,102` (`@MinLength(8)`); `backend/src/common/password-security.service.ts:22`; `patient-web/lib/auth/password-rule.ts:2` | `/register`: password input `minlength="8"` in ar and en, both widths | LIVE-OK | |
| LR-4 | Differentiator 1: guaranteed appointment with a small Nabdat credit | LR | `patient-app/src/utils/differentiators.ts` §1; `patient-web/components-next/consult/differentiators.tsx` (`GuaranteeLine`); `backend/src/modules/loyalty/guaranteed-appointment.ts` | Needs the server setting and a doctor page; not reached | NOT-VERIFIED | Shown only when `late_guarantee` is set in `/system-config/public`. |
| LR-5 | Differentiator 2: insurance estimate from the card's copay % and cap | LR | `patient-web/lib/insurance/copay.ts`; `patient-app/src/utils/insurance-copay-contract.ts` | Needs a saved policy (auth) | NOT-VERIFIED | |
| LR-6 | Differentiator 3: licence line "licensed by SCFHS, no. X" only | LR | `patient-web/components-next/consult/differentiators.tsx` (`LicenseLine`); `backend/src/modules/care/care.service.ts:698` | Doctor page not reached | NOT-VERIFIED | Code emits number, authority, verified flag, no date. |
| LR-7 | Differentiator 4: "available today" sort | LR, OD-20 | `backend/src/modules/care/care.controller.ts:49,64` (`sort=available_today`) | `/ar/consultations/doctors`: sort options "متاح اليوم", "الأقرب", "متاح الآن" present | LIVE-OK | |
| LR-8 | Differentiator 5: visit-summary actions (prescription, labs, scans) | LR | `patient-web/lib/consult/follow-up-actions.ts`; `backend/src/modules/care/appointments.service.ts` | Needs a completed visit | NOT-VERIFIED | |
| LR-9 | Doctor card and page fields | LR, PD 1866/1867 | `patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx`; open rows in `docs/design/needs-review/doctor-card-*.json` | Doctor page not reached | WRONG | The page draws `education` and `wait_time`, but the backend does not send them yet (`docs/design/PROGRESS.md`, issue #1819). Client side is built. |
| LR-10 | Provider registration fields | LR | `docs/review/AUDIT_2026-10-02.md:69` (R83): clinic name and address are required at step 3 but nothing in the backend reads them | — | WRONG | Taken from the 2026-10-02 audit; not re-checked here. |
| LR-11 | Uploads closed until the RAM upgrade | LR | No gate found: `patient-web/components-next/pharmacy/rx-upload-screen.tsx:104` posts to `/api/patient/prescriptions/upload`; `backend/src/modules/storage/storage.module.ts` has no flag | Not checked (auth) | MISSING | Grep for a flag (uploads_enabled, RAM, upload gate) found nothing in code. The decision source is not in the docs. |
| LR-12 | Facility accounts deferred | LR, `docs/product/FACILITY_ACCOUNTS_AUDIT_2026-10-23.md`, PROGRESS "Facility accounts stay on hold" | `patient-web/app/[locale]/facility/page.tsx` exists | Not checked | NOT-VERIFIED | |
| LR-13 | Removed features (OD 1–4, 8, 14) not visible | LR | See section B | See section B | REMOVED-BUT-VISIBLE | Summary: community, leaderboard and the app SOS and tracking screens still exist. |

## B. Owner decisions 2026-10-06 (`OWNER_DECISIONS_2026-10-06.md`)

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| OD-1 | Remove community user posts; doctor articles instead | Web: `patient-web/app/[locale]/community/page.tsx` redirects to `/articles`. App: `patient-app/app/community/hub.tsx`, `post-detail.tsx` still present. Backend: `backend/src/modules/community/` still present | `/ar/community` and `/en/community` → `/articles` | REMOVED-BUT-VISIBLE | Web redirect OK. App screens and backend module remain. |
| OD-2 | Remove loyalty leaderboard | Web: `patient-web/app/[locale]/loyalty/leaderboard/page.tsx` redirects. Backend route removed (`backend/src/modules/loyalty/loyalty-leaderboard-removed.spec.ts`). App: `patient-app/app/loyalty/leaderboard.tsx` and `LoyaltyHub.tsx` still link to it | `/ar/loyalty/leaderboard` → `/login` (auth gate) | REMOVED-BUT-VISIBLE | App screen still shipped. |
| OD-3 | No family-call UI (family chat stays) | `patient-web/app/[locale]/family/chat/page.tsx:10`: no call button. No call code in app | `/en/family` → `/login` (auth gate) | IN-CODE-NOT-LIVE | Not checked live. |
| OD-4 | Delete `/ai/skin-analysis` | Route removed in `backend/src/modules/ai/ai.controller.ts`. Method still in `ai.service.ts:269` (dead). Web: redirects. App: `patient-app/app/ai/skin-analysis.tsx` still present | `/ar/ai/skin-analysis` → `/ai` | REMOVED-BUT-VISIBLE | App screen remains. Dead service method. |
| OD-5 | Merge health and family duplicates (after owner approves the map) | `docs/design/MERGE_MAP.md`, `MERGE_MAP_2.md` exist | — | NOT-VERIFIED | Not checked. Merge must wait for approval. |
| OD-6 | Settings reduced to 6–8 screens | — | — | NOT-VERIFIED | Not checked. |
| OD-7 | One AI assistant (merge the 7 routes) | Web still has separate routes: `patient-web/app/[locale]/ai/{chat-doctor,symptom-checker,triage,symptom-timeline,prescription-translator,report}`. App: `patient-app/app/ai/*.tsx` separate | `/ar/ai` shows three tools | WRONG | Merge not done on web or app. |
| OD-8 | Mental health: no self-assessment, no in-app crisis handling; one "Need urgent help?" button | Web: self-assessment and crisis routes redirect. Backend comment `mental-health.controller.ts:46` | `/ar/mental-health`: "مساعدة عاجلة" button present; no `tel:` link in the DOM; `/mental-health/crisis-contacts` and self-assessment redirect | IN-CODE-NOT-LIVE | The number comes from admin config; the owner enters it. No dialer link until it is set. |
| OD-9 | Loyalty challenges: health habits only | `backend/src/modules/loyalty/loyalty.service.ts:45-51` (purchase `target_action` refused) | Not checked (admin) | IN-CODE-NOT-LIVE | |
| OD-10 | Rx items: badge, no offers or points, controlled never online, consult button | Strings "يحتاج وصفة" in `patient-web/messages/ar.json` and `patient-app/src/i18n/locales/ar.json`; server flags `backend/src/modules/prescriptions/prescriptions.service.ts:268`, `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:249-251`; "استشر طبيب" `backend/src/modules/medicines/rx-consult.controller.ts:38` | Public catalogue is empty on the live site, so no product page to check | IN-CODE-NOT-LIVE | Server enforcement of "no discount on Rx" not confirmed by grep. |
| OD-11 | "Online only" badge | Strings "أونلاين فقط" in the locale files; flag mapped in `backend/src/modules/users/users.service.ts:57` | Catalogue empty | IN-CODE-NOT-LIVE | |
| OD-12 | Price ceiling: reject offers above the SFDA price; unmapped lines to admin | `backend/src/modules/pharmacy/services/pharmacy-offer.service.ts:256` says the catalogue price is a reference (the 2026-10-10 amendment) | — | WRONG | Differs from the 06-10 text (reject above). Matches PD 1138 (approved 2026-10-10). Owner to confirm which text stands. |
| OD-13 | Offers waiting: "expanding", then "no pharmacy available"; never endless | `backend/src/modules/pharmacy/services/pharmacy-order.service.ts:314-322` | Not reached | IN-CODE-NOT-LIVE | |
| OD-14 | Emergency: dial 997 and send location to family; no ambulance, dispatch or tracking | Web: `/emergency/tracking` redirects. Web emergency page has no "997" (only in `messages/*.json`). App: `patient-app/app/emergency/tracking.tsx`, `sos.tsx`, `sos-active.tsx` still present, no "997" in `patient-app/app/emergency/`. Backend: `backend/src/modules/emergency/`, ambulance enum `backend/src/common/enums.ts`. Issue #333 closed as done | `/ar/emergency` and `/en/emergency`: urgent-help text, but no "997" and no `tel:` link | WRONG | The 997 dial is missing live and in code. Ambulance code is still in the backend and app. GitHub #333 is closed but the code is not removed. |
| OD-15 | AI assistant limits: no diagnosis, drug or dose; 100-prompt test set; disclaimer; red-flag button | `backend/src/modules/ai/assistant.service.ts:10` (rules in the prompt); disclaimer visible on `/ar/ai` | Disclaimer text present | MISSING | No output filter for drug names and doses found (`grep` for a filter, `blockDrug`, `doseFilter`); test set not found. Not confirmed beyond grep. |
| OD-16 | Module switches for 12 modules, instant from admin | `backend/src/modules/module-switches/` (controller, middleware, service); admin `module-switches` page | Not checked (admin) | IN-CODE-NOT-LIVE | |
| OD-17 | Doctor profile: SCFHS number and verified badge; never national ID, phone, email | `patient-web/components-next/consult/differentiators.tsx` (`LicenseLine`) | Not reached | NOT-VERIFIED | |
| OD-18 | "اطلب الأدوية دي" fills the cart from a consultation's prescription | String in `patient-app/app/health/actionable-order.tsx` and app locale files; no web string | — | IN-CODE-NOT-LIVE | Web lacks it. The file's comment says it was removed as a screen. |
| OD-19 | Lab result push opens the result with "ناقش النتيجة مع طبيب" | String "ناقش النتيجة" in locale files; push path not traced | — | IN-CODE-NOT-LIVE | |
| OD-20 | Nearest and available-now sorts | See LR-7 | `/ar/consultations/doctors` shows "الأقرب" and "متاح الآن" | LIVE-OK | |
| OD-21 | Hosting migration plan | Issue #340 open | — | N/A-OWNER | |
| OD-22 | PDPL inventory and access log | Issue #341 open | — | N/A-OWNER | |
| OD-23 | Licensing; Nafath and Wasfaty not started | Issue #342 open. No Nafath or Wasfaty code found | — | N/A-OWNER | |
| OD-24 | Doctor chat only inside a booking; 72-hour follow-up window | `patient-web/components-next/consult/chat-composer.tsx` exists; `backend/src/modules/chat/consultation-window.ts` | Not reached (auth) | IN-CODE-NOT-LIVE | PD 806 approved "add writing"; composer present. |
| OD-25 | Payment by service: online-only consultations, home visits and nursing; cash only for pharmacy under rules | `backend/src/modules/finance-engine/finance-engine.module.ts:643`; `backend/src/modules/home-care/home-care-compat.module.ts:143-144` rejects cash for home visits | Not checked | IN-CODE-NOT-LIVE | |
| OD-26 | Cancellation and refund table (7-day rule; fees shown before payment) | `backend/src/modules/finance-engine/finance-engine.module.ts:806-817`. Terms: `patient-web/messages/en.json` has no "50%" recovery clause | `/en/terms` loads | WRONG | PD 781 approved adding the 50% recovery to the terms; not in the text. Lawyer review pending. |
| OD-27 | Second merge pass for all sections | Not started (waits on OD-5) | — | NOT-VERIFIED | |
| OD-28 | Security sweep S-1 to S-7 | Not audited here (S session owns it) | — | NOT-VERIFIED | |
| OD-29 | Search: self-hosted Meilisearch, Arabic normalisation, six languages | `backend/src/modules/search/meili.client.ts:2` | Not checked | IN-CODE-NOT-LIVE | |
| OD-30 | Insurance chosen first; saved policy; relay to contracted provider | `backend/src/modules/insurance-engine/insurance-engine.module.ts:692-698` (self-pay after rejection) | `/ar/insurance` lists companies and classes; doctors list shows "تأمين" and "دفع ذاتي" tags | IN-CODE-NOT-LIVE | Known (S fixing): company, class, copay and CHI link on live. |
| OD-31 | Double taps and bad networks: idempotency, no double charge | Idempotency keys in the API helpers (per decision text) | Not checked | NOT-VERIFIED | Tests not run here. |
| OD-32 | Data map document `docs/architecture/DATA_MAP.md` | File exists | — | IN-CODE-NOT-LIVE | Document, not a live feature. |
| OD-33 | Backups and secrets after the 2026-10-08 incident | Server-ops work | — | N/A-OWNER | |
| OD-34 | "Operations & Security" admin page | `backend/src/modules/admin/ops-security/ops-security.controller.ts:4` | Admin not checked | IN-CODE-NOT-LIVE | |
| OD-35 | Insurance is relay-only; no live NPHIES; rename or remove `nphies*` | `backend/src/modules/users/users.dto.ts:51` (`nphies_eligible`); `backend/src/modules/insurance-engine/insurance-engine.module.ts:347`; `backend/src/modules/radiology/radiology.service.ts:298` ("NPHIES Gatekeeper") | — | WRONG | Names that imply a live insurer check are still in code. |
| OD-36 | Legal texts published as version 1.0 from `legal_policies` | `backend/src/modules/auth/auth.service.ts:741-749` | `/ar/terms`, `/en/privacy`, `/en/terms` load | LIVE-OK | Pages serve. Content vs PD 781 is OD-26. |
| OD-37 | Expired licences block the provider automatically | `backend/src/modules/provider/services/scfhs-license.service.ts:68,101` | Not checked | IN-CODE-NOT-LIVE | |

## C. Owner decisions approved 2026-10-10 (`OWNER_DECISIONS_PENDING_2026-10-09.md`), checked rows only

| ID | Agreed | Code (main) | Live | Status | Notes |
|---|---|---|---|---|---|
| PD-404 | Web doctor filters: specialty, visit type, cash or insurance | `patient-web/components-next/consult/doctor-quick-filters.tsx`, `patient-web/lib/consult/doctor-filters.ts` | `/ar/consultations/doctors`: "الكل", "استشارة فيديو", "زيارة منزلية", "تأمين", "دفع ذاتي" present | LIVE-OK | |
| PD-806 | Web doctor chat: write messages | `patient-web/components-next/consult/chat-composer.tsx:16` | Not reached (auth) | IN-CODE-NOT-LIVE | |
| PD-781 | 50% recovery in terms | — | — | WRONG | See OD-26. |
| PD-1138 | Pharmacist may enter a price above the catalogue (amended 2026-10-10) | `pharmacy-offer.service.ts:256` | — | WRONG | See OD-12: code matches the amendment, but the original text of OD-12 is still in the decisions doc. |
| PD-777 | OpenStreetMap allowed in the CSP | `patient-web/lib/security/csp.ts`; test `patient-web/tests/csp-openstreetmap.test.ts` | Not checked | IN-CODE-NOT-LIVE | |
| PD-981–993 | Admin public pages removed | Admin not checked | — | NOT-VERIFIED | |

## D. Not-checked lines

PD 363, 364, 371, 372, 376, 378, 388, 390, 393, 394, 396, 622, 625, 628, 629, 638, 646, 651, 663, 666, 669, 678, 679, 684, 685, 692, 695, 701, 752, 755, 756, 763, 767, 769, 794, 795, 797, 800, 808, 819, 821, 833, 843, 851, 875, 876, 878, 918, 949, 952, 1097, 1127, 1155, 1159, 1176 — NOT-VERIFIED in this audit (not checked; no evidence either way). Several are already built per the decisions doc, not necessarily wrong.

## Summary

Counts (rows in sections A–C, 56 in total):

| Status | Count |
|---|---|
| LIVE-OK | 5 |
| IN-CODE-NOT-LIVE | 19 |
| MISSING | 2 |
| WRONG | 9 |
| REMOVED-BUT-VISIBLE | 4 |
| NOT-VERIFIED | 13 |
| N/A-OWNER | 4 |

Section D lists about 60 further PD rows, all NOT-VERIFIED (not counted above).
