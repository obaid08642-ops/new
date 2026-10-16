# Provider app walkthrough (2026-10-16)

Method: `docs/review/WEB_SERVICES_SESSIONS_BRIEF.md` applied to `provider-app` (doctor, pharmacy, lab, radiology, home care / nursing, hospital).
The app has no `app/**` routes: it is react-navigation (`App.tsx` plus one navigator per provider type), so "every screen" means every
screen registered by the six navigators (`docs/review/inventory/screens.json`).

How it was run
- `expo export --platform web` with `NABD_WEB_TEST=1 EXPO_PUBLIC_NABD_E2E=1` (browser test build; the QR-code package is not installed in this checkout, so the export aliases it to a stub; nothing of that is committed), served with an SPA fallback, pointed at the local live stack on a fresh test DB.
- One provider of each type registered through the real onboarding endpoints and approved by the admin (`tools/live/j_onboarding.py`), then the type's journey was run so every dashboard has data (orders, bookings, allocations, wallet entries): `j_pharmacy`, `j_lab`, `j_radiology`, `j_nursing`, `j_consultation`, `j_facility`.
- Each provider signed in through the app's own Welcome and Login screens in Chromium at 390x844.
- Crawl: the existing tap crawler (`tools/live/rn_nav_crawl2.py`, copied and bounded to 13 minutes per type) tapped the controls of the screens it reached and checked, per write, that the typed value reached the database. Evidence: `docs/review/evidence/rn_walk_provider-app_<type>_2026-10-16.json`.
- Visit: every registered route of each type was opened directly by route name in Arabic and in English (`rn_visit_provider-app_<type>_2026-10-16.json`): JS errors, 4xx/5xx reads, raw keys, icon words, Arabic in English, Latin text in Arabic, "undefined/NaN", horizontal overflow.
- Static pass: every `client.get/post/put/patch/delete` call of the app (374) matched to a backend route by method and path (0 unmatched), every write handler read for "answers ok and stores nothing", and the money, order and prescription flows read end to end against the backend service.
- The provider app has two languages (ar, en) and writes its strings inline as `AR ? 'عربي' : 'English'`; there is no translation file to hold raw keys, so "missing translation" here means a string that has only one language.

## Counts
First list (static pass plus the first crawl batch: doctor, pharmacy, lab). Radiology, home care and hospital crawls and the all-routes visit are running and will be added to this file in this PR.
- Defects so far: 11 (broken 5, wrong 5, copy 1); fixes are in separate PRs.

## Defects (class: broken / missing / wrong / illogical / slow / copy)
Fixed in a PR = PR number; otherwise "open".

| # | Screen | Control / state | What happens | What should happen | file:line | Class | Status |
|---|---|---|---|---|---|---|---|
| P1 | Wallet > history (all six types) | each row | Refund clawbacks, cancellation penalties and chargebacks (ledger rows stored with a positive amount and subtracted by `providerBalance`) are returned as `CREDIT`, so the provider sees money received in green with a "+" | A debit, with a "-" | backend/src/modules/provider-ops/provider-ops.module.ts:768 | wrong | open (PR in progress) |
| P2 | Wallet > history | date under the title | `Date#toString().slice(0,10)` gives "Fri Oct 02": no year, English weekday, in the Arabic UI | ISO date | backend/src/modules/provider-ops/provider-ops.module.ts:767 | wrong | open (PR in progress) |
| P3 | Wallet | open while the balance or history read fails | `console.warn` only; the card shows "0 SAR available", the history says "No transactions yet" | An error state with retry; never a 0 that was not read | provider-app/src/screens/shared/shared/ProviderWalletScreen.tsx:67 | wrong | open (PR in progress) |
| P4 | Withdraw funds | "Request withdrawal" refused | Machine codes the server answers with (`insufficient_available_balance`, `minimum_withdrawal_100`, `pending_withdrawal_exists`, `verified_bank_account_required`) are shown as the message, or the generic text (see P6) | A sentence in the provider's language with the number | provider-app/src/screens/shared/shared/WithdrawalWorkflow.tsx:107 | copy | open (PR in progress) |
| P5 | Every screen with an empty state (about 40: orders, results, chats, offers, notifications, jobs) | empty-state icon | `NEmpty` draws its `icon` prop as text, so the 56px glyph is the word "calendar", "document", "alert", "flask"... | The icon (4 of the names, `flask`, `notifications`, `hospital`, `checklist`, had no icon at all) | provider-app/src/components/ui.tsx:530 | wrong | open (PR in progress) |
| P6 | Every screen, every failing request (about 70 catch blocks) | any rejected call | The client rejects with the bare response body, so `err.response` is undefined: every `err.response.data.message` / `err.response.status` reader falls to its generic text. Dead as a result: the pharmacy allocation messages ("collect the exact amount", "COD proof required", "payment not confirmed", "insurance decision first"), the prescription-issue rule ("consultation must be in progress"), "invitation already answered", the 401 fallback of the drug image upload and of job applications, the contract download 403 text, payout reasons | Reject with the AxiosError (response kept), `err.message` still the server sentence | provider-app/src/api/client.ts:57 | broken | open (PR in progress) |
| P7 | Doctor Chats tab, Lab chat | open a conversation | `GET /chats/{id}/messages` answers `{messages, has_more}` (newest first, `sender_id`, `body`); the room does `setMessages(res.data)` and calls `.map` on the object, so opening any conversation throws; field names (`sender === 'me'`, `text`, `time`) match nothing the server sends | Messages mapped from the server shape | provider-app/src/screens/shared/shared/ChatSystem.tsx:129 | broken | open (PR in progress) |
| P8 | Doctor Chats tab, Lab chat | Send | Failure is swallowed (`// optimistic UI send`): the bubble stays, the provider believes it was delivered even when the server refused (follow-up window over, chat closed by the doctor, kill switch) | Keep the text and show the server's reason | provider-app/src/screens/shared/shared/ChatSystem.tsx:149 | broken | open (PR in progress) |
| P9 | Doctor Chats tab, Lab chat | conversation list | Row title is `booking_kind` ("consultation") or "—"; the header of every conversation says "Offline" (`conv.online` is never set); a failed list read shows the same empty list as "no chats" | Readable title, no invented presence, error state | provider-app/src/screens/shared/shared/ChatSystem.tsx:46,194 | wrong | open (PR in progress) |
| P10 | Doctor Chats tab, Lab chat | attach photo / file | The upload URL is sent as the message text (`{text: url}`), the failure of that send is `.catch(() => null)` | `POST /media/upload` then `media_ids`, as the patient app does | provider-app/src/screens/shared/shared/ChatSystem.tsx:175-177 | wrong | open (PR in progress) |
| P11 | Pharmacy > Procurement (B2B) | "Send" with text, or shelf photo | `const res = await client.post(...); items = res?.items`: the items are at `res.data.items`, so the cart never receives a line and the screen always says "AI found no items" even when the server found them | Use `res.data.items` | provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:456 | broken | open (PR in progress) |

## Not reachable on react-native-web (needs a device)
- Camera and gallery: lab sample scanner, QR check-in (facility), prescription photos, shelf photo for procurement, profile photo capture, ID and licence documents in registration.
- Push notifications (token registration, deep links from a notification).
- Calls: LiveKit video and voice (`VideoCallRoom`, live consultation, waiting room).
- Maps and GPS: `react-native-maps` is native-only; on web the two screens that load it directly throw `codegenNativeComponent is not a function` (Location tab of the profile editor, doctor Settings > "Location and coverage"). Not a device defect.
- Biometric login, haptics, vibration, file save and share sheets, secure storage (shimmed in the test build).
- Token expiry: the access token lives 14 days (`provider.module.ts:136`), so the 401 path was not exercised end to end.

## Remaining
To be filled when the visit finishes.
