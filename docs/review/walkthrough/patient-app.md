# Patient app walkthrough (2026-10-16)

Method: `docs/review/WEB_SERVICES_SESSIONS_BRIEF.md` applied to `patient-app`. The app was exported for react-native-web
(`expo export --platform web`, `NABD_WEB_TEST=1`), served with an SPA fallback, pointed at the local live stack
(fresh test DB, seeded admin, a patient created through the app's own sign-up) and driven with Chromium at 390x844.
Machine evidence: `docs/review/evidence/rn_web_patient-app_2026-10-16_{s1..s4,unauth}.json` (`tools/live/rn_web_crawl.py`).

## Counts
- Screens: 235 static routes opened signed in at 390 (ar), 11 auth/onboarding routes signed out, 224 routes re-opened in en (Arabic leakage, raw keys, horizontal overflow; a hi sweep was started and stopped early to free the shared stack), 5 deep-link/dynamic routes opened by hand. Total route openings: 475.
- Controls: 1,291 distinct controls tapped by the crawler (336 navigate, 111 change the screen, 49 write to the backend, 14 skipped as destructive, 392 no visible effect, 386 not tappable by the crawler, 3 JS errors) plus about 40 controls driven by hand (pharmacy request, language switch, FAQ, feedback).
- The crawl's "no effect" and "tap failed" buckets are mostly noise: selection chips and tabs that change style only, retry buttons on screens opened without parameters, and a crawler run that switched the app to Filipino half way (the language screen is a control it taps). They were triaged by hand; the real ones are below.
- Failures: 20 real defects (below), 18 routes with 4xx reads (all explained: "no family yet" 404s, parameterless deep links), 8 routes with JS errors (all react-native-web only, see "Not reachable").
- Backend answers during the walk: no 5xx; the only 4xx are the ones in D11, D12, D17 and the expected wrong-OTP 400.
- Seeded data: a fresh patient with one address and two catalogue medicines; no doctors, labs or pharmacies are seeded on the test DB, so doctor, lab and pharmacy lists show their empty states (checked, correct) and the offer/quote/payment screens were covered by the API journeys (`tools/live/j_pharmacy.py`, `j_consultation.py`) rather than by taps.

## Defects (class: broken / missing / wrong / illogical / slow / copy)
Fixed in a PR = PR number; otherwise "open".

| # | Screen | Control / state | What happens | What should happen | file:line | Class | Status |
|---|---|---|---|---|---|---|---|
| D1 | Help > Feedback | "Send" | `POST /support/feedback` answers `{success:true}` and stores nothing; the patient's words, stars and kind are lost (fake success) | The feedback reaches the admin support queue | backend/src/modules/support/support.service.ts:132 | broken | PR 1624 |
| D2 | Help > FAQ | list | Two invented placeholder questions when the admin wrote none ("هل التأمين مغطى؟") | Empty state until the admin writes FAQs | backend/src/modules/support/support.service.ts:100 | wrong | PR 1624 |
| D3 | Help > FAQ | list (en/ur/hi/bn/fil) | Arabic questions; `question_en`/`answer_en` ignored | English text for non-Arabic | patient-app/src/components/account/HelpView.tsx:75 | copy | PR 1624 |
| D4 | Loyalty hub | tier name, perks, ways to earn (not Arabic) | Arabic sentences from the server drawn as is | Patient's language by tier id / perk code / earn reason | patient-app/src/components/loyalty/LoyaltyHub.tsx (hero, `earnWays`, perks) ; backend loyalty.service.ts:18,61 | copy | PR 1622 |
| D5 | Health tab | score card | Component names, recommendation and the "not enough data" text in Arabic for every language although the server sends `*_key` | Use the keys | patient-app/app/(tabs)/health.tsx:106,109,114 | copy | PR 1623 |
| D6 | Unknown route `/anything` | page | Arabic text and teal links (raw colours) in every language, `@ts-nocheck` | Localized not-found with Search / Home | patient-app/app/+not-found.tsx | copy | PR 1621 |
| D7 | `/p/:slug`, `/medicine/:slug`, `/doctor/:slug`, `/facility/:slug`, `/s/:type/:slug` | loading text | Arabic only, raw colours (#F8FAFC, #0D9488, #64748B), `router.replace` during render | Localized, tokens, no side effect in render | patient-app/app/p/[slug].tsx, doctor/[slug].tsx, facility/[slug].tsx, s/[type]/[slug].tsx, medicine/[slug].tsx | copy | PR 1621 |
| D8 | `/doctor/x`, `/facility/x` (dead link) | page | Silently lands on the doctor search / the list of specialties (a facility link opens specialties) | Say the link no longer exists, offer search / home | patient-app/app/facility/[slug].tsx:39 | illogical | PR 1621 |
| D9 | `/p/:slug` with a found entity without id | page | Opens a product by its raw slug as id | Not found | patient-app/app/p/[slug].tsx:23 | wrong | PR 1621 |
| D10 | Settings > Privacy > My data | storage rows | "الوصفات المرفوعة", "التقارير الطبية" Arabic in every language (label sent by the server) | Key per row, translated | backend/src/modules/users/users.service.ts:327; patient-app/src/components/account/PrivacyView.tsx:100 | copy | open |
| D11 | Pharmacy product page opened without `id` | page | Requests `/medicines/undefined/details` and shows a retry that cannot succeed | Not-found state, no request | patient-app/app/pharmacy/product-detail.tsx:213 | wrong | open |
| D12 | Nurse profile / service info opened without params | page | Requests `/home-care/providers/undefined`, `/home-care/services/undefined` | Not-found state, no request | patient-app/app/nursing/nurse-profile.tsx:77, service-info.tsx:30 | wrong | open |
| D13 | Doctors tab | "Specialties" section | Header and "View all" drawn with an empty row when every specialty has 0 doctors | Hide the section (as the list is filtered) | patient-app/app/(tabs)/consultations/index.tsx:370-374 | illogical | open |
| D14 | Home | tier card ("رصيدك: 0 نقطة | تخصم حتى ١٠٪") | Arabic-Indic digits in one line, Latin digits elsewhere on the same screen | One digit system per language | patient-app/app/(tabs)/index.tsx (loyalty strip; not located to a line) | copy | open |
| D15 | Lab comparison | lab card | `onPress={undefined}`: the card looks pressable but has no action | Open the lab, or not a pressable card | patient-app/app/diagnostics/lab-comparison.tsx:102 | illogical | open |
| D16 | Emergency | "Send my location to my family" | With no family group and no emergency number the screen offers the button; the crawl saw no effect | Hide or explain when there is no family group | patient-app/app/emergency/index.tsx | illogical | open (needs a device to confirm) |
| D17 | Family hub, calendar, chat | first open without a family | `GET /family/my-group`, `/family/members`, `/family/calendar`, `/family/permissions/pending` answer 404 and `/family/chat/messages` 403 for a normal "no family yet" answer; UI is right | 200 with `null`/`[]` (404/403 show as errors in monitoring) | backend family controller; patient-app/src/components/family/FamilyKit.tsx:47 | wrong | open (backend) |
| D18 | Auth > OTP | "Confirm" with a wrong code | 400 (expected) but the screen stays "not ready" for 15 s in the crawl: no visible error state was captured | Confirm an error message is shown | patient-app/app/(auth)/otp.tsx | copy | open (verify on device) |
| D19 | Pharmacy tab | product list | `GET /medicines?limit=5` (no query) returns `[]` for a catalogue with approved medicines but no pharmacy stock, so the Pharmacy tab shows "no products" while a search by name finds them | Decide: browse shows the catalogue, or the empty state says why | backend/src/modules/medicines/medicines.controller.ts:17 | illogical | open (product decision) |
| D20 | Tab bar (all tabs) | bottom area | The floating bar covers the last row of Home content at 390x844 until scrolled | Bottom padding = bar height | patient-app/app/(tabs)/index.tsx (not located to a line) | wrong | open (check on device) |

## Not reachable on react-native-web (needs a device)
- Camera and gallery: prescription photo, barcode scanner, drug scanner, QR family scan, insurance card scan, skin analysis, food scanner.
- Push notifications (permission prompt, deep links from a notification, `getLastNotificationResponse`: web throws, native does not).
- Calls: LiveKit video/voice (`consultations/video-call`, `incoming-call`, waiting rooms), call history audio.
- Maps and GPS: location picker, nursing live tracking, emergency location sharing, `map/index`.
- Native modules that the web build cannot load: `expo-media-library` (permissions manager; stubbed for this walk), `expo-secure-store` (shimmed by the audit build), Urdu font installer (`src/theme/urduText.tsx:48` throws `Cannot redefine property: Text` on web only; fine on native), biometric lock, haptics, share sheet, file save.
- Apple/Google sign-in sheets, Moyasar 3-D Secure page (the fake Moyasar was used by the API journeys).

## Remaining (not fixed in this session)
D10 to D20. D4 and D5 show the pattern (server text drawn without the id the server already sends); the same pattern is likely in other server-written lists (earn caps, challenge titles, reward titles, offer titles): worth one sweep of `apiFetch` consumers that draw `title`/`label`/`message` from the server.
