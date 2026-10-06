# Screen merge map 2 (owner decision 27, second pass over ALL sections), 2026-10-06

**Status: APPROVED (2026-10-06)** by the lead reviewer, delegated by the owner (decision 27), with the answers in §11. Same format as `MERGE_MAP.md` (approved; its health, family, settings, AI and mental-health rows are **not repeated** here and stay as approved, except the two changes in §9). Source of the route list and the endpoints: `docs/design/inventory/screens.json`. Rows I could not decide from route names, templates and endpoints say **confirm**; I did not read every screen file.

**Rules (as in MERGE_MAP.md)**
- One screen per user task. An old route becomes a redirect (web: `redirect()` / `next.config`; app: `<Redirect>`) that keeps the query string; deep links and notification targets keep working. In-code links are updated to the new route; the redirect is only for stale links.
- A merged screen uses one template (hub / list / detail / form / flow step) with tabs or sections; tab state is in the URL (`?tab=`), health data never is.
- Nothing is dropped silently: every row says where the old screen's content goes.
- **Priority services keep their journeys** (decision 27): pharmacy, consultations, labs/radiology, nursing. For them I only merge true duplicates (two routes for one thing, or a step that is a state of the previous screen); every such row is small and marked, and none changes who pays, what is booked or the order of steps.
- Removed features stay removed (community posts, loyalty leaderboard, family calls, AI skin analysis, self-assessment, ambulance and tracking UI).
- **When:** each merge is done in the batch that owns the screen. Screens already rebuilt in Batches 1 to 4 (pharmacy, consultations, labs/radiology, nursing) are merged in one **follow-up PR after those batches merge** ("Batch 14: second-pass merges"), so open PRs are not reopened. Batches 5 and 6 already follow MERGE_MAP.md.

## Totals (screens now → proposed; redirect routes excluded; web public SEO/entity pages are not counted)

| Area | Now (app / web) | Proposed (app / web) |
|---|---|---|
| Consultations (incl. web `/appointments`, `/chat`) | 21 / 22 | 17 / 16 |
| Labs / radiology (`/diagnostics/**`) | 17 / 21 | 15 / 19 |
| Pharmacy (incl. drug scanner, web catalogue, wishlist) | 21 / 22 | 18 / 16 |
| Nursing / home care | 7 / 9 | 7 / 9 |
| Orders, returns, payments, cart | 5 / 13 | 5 / 13 |
| Insurance (incl. app `/profile/insurance`) | 10 / 13 | 5 / 5 |
| Loyalty, offers, programs | 8 / 9 | 4 / 4 |
| Maternity | 2 / 5 | 2 / 2 |
| Nutrition | 4 / 5 | 2 / 2 |
| Emergency | 3 / 4 | 1 / 1 |
| Account and addresses | 4 / 4 | 3 / 2 |
| Support | 2 / 3 | 2 / 2 |
| Articles, community | 5 / 5 | 2 / 2 |
| Notifications inbox, reviews, map | 3 / 3 | 3 / 3 |
| Voice, app legal pages | 3 / 1 | 0 / 0 |
| **This map** | **115 / 139** | **86 / 96** |
| MERGE_MAP.md (health, family, settings, AI, mental health) | 47 / 51 | 23 / 25 |
| **Both maps** | **162 / 190** | **109 / 121** |

## 1. Consultations (priority: journey unchanged; booking, payment, call and rating steps stay)

| New / kept screen | Old routes | Old becomes | What happens |
|---|---|---|---|
| Appointment detail (app `/consultations/appointment-detail`, web `/appointments/[id]`) | app `/consultations/summary`, `/consultations/prescription-from-doctor`; web `/appointments/[id]/summary`, `/consultations/prescription` | redirect | One booking page with sections **Status · Summary · Prescription (button "اطلب الأدوية دي", decision 18) · Follow-up**. All four read the same appointment (`/care/appointments/:id`, `…/summary`). |
| Booking (`/consultations/book/[id]`) | `/consultations/follow-up` (app and web) | redirect to the booking with `?followUp=<appointmentId>` | A follow-up is a booking with the doctor pre-selected and the original appointment attached. The "book a follow-up" button of decision 24 opens it. **Confirm** the follow-up endpoint takes the same payload as a booking. |
| Booking status (`/consultations/booking-status`) | `/consultations/clinic-confirm` (app and web) | redirect | The clinic confirmation is the confirmed state of the same booking page. **Confirm** (both screens show one booking). |
| Doctor chat thread (app `/consultations/chat-with-doctor`, web `/chat/[threadId]`) | web `/consultations/chat`, web `/chat` (thread list)| `/chat` list redirects to the bookings list (`/appointments`, app `/consultations/appointments`) | **Decision 24:** no free doctor chat. One thread screen, reached only from a booking (appointment detail) and from a notification about it. Rules in §9. |
| Kept as they are | `/`, hub, `appointments`, `book`, `cancel-reschedule`, `call-history`, `clinic/[id]`, `doctor/[id]`, `home-visit-tracking`, `incoming-call`, `post-call-rating`, `share-report`, `specialty-select`, `video-call`, `virtual-waiting-room`, `room/[id]` | — | Journey steps; calls keep the single call with camera on/off (decision 24). |

Result: app 21 → 17 (summary, prescription-from-doctor, follow-up, clinic-confirm removed); web 22 → 16 (appointment summary, prescription, follow-up, clinic-confirm, consultations/chat, `/chat` list removed).

## 2. Labs and radiology (priority: journey unchanged)

| New / kept screen | Old routes | Old becomes | What happens |
|---|---|---|---|
| Insurance step (`/diagnostics/insurance-approval`) | `/diagnostics/insurance-upload` (app and web) | redirect | Upload the card/approval and see its status on one screen (two states of one step). |
| Sample / technician tracking (`/diagnostics/sample-tracking`) | app `/diagnostics/technician-tracking`, web `/diagnostics/technician-tracking` | redirect | One timeline; the technician block (map, ETA) appears for home collection only. **Confirm** that both read the same order. |
| Web `/diagnostics/labs/book` | — | **confirm** | Looks like a second entry to the checkout (`/diagnostics/checkout`); I could not tell from the endpoints. Not counted as a merge until confirmed. |
| Kept | hub, search, packages, package-detail, test-detail, lab/[id], lab-comparison, cart, checkout, book-sample, my-results/results, orders/order/[id] / bookings / `[domain]/[bookingId]`, booking-success, radiology pages | — | Journey steps. |

Result: app 17 → 15; web 21 → 19.

## 3. Pharmacy (priority: journey unchanged: browse, cart, request, offers, negotiation, payment, tracking)

| New / kept screen | Old routes | Old becomes | What happens |
|---|---|---|---|
| Catalogue with a filter sheet | app `/pharmacy/filters`, web `/pharmacy/filters` | redirect to the catalogue (filters in the URL) | Filters are a sheet on the catalogue, not a page. |
| Scan a medicine | app `/pharmacy/barcode-scanner`, `/drug-scanner`; web `/pharmacy/barcode`, `/pharmacy/interactions`, `/drug-scanner` (redirect) | redirect | One screen: scan or type a barcode → the product; "check interactions" is a section on the result (`/ai/drug-interactions`, `/pharmacy/interactions`). |
| Waiting for offers | web `/pharmacy/waiting-for-pharmacy` | redirect to `/pharmacy/broadcast-status` | The same waiting state as the app's broadcast-status. **Confirm.** |
| My orders (`/orders`) | app `/pharmacy/order-history` | redirect | The app has two lists of the same orders. |
| Catalogue (web `/c`) and product (web `/p/[slug]`) | web `/medicine/[slug]`, `/medicines` (list), `/medicine-catalog` | redirect (permanent, for SEO) | Two catalogues and two product pages. `/c` and `/p/[slug]` are canonical (Batch 1 rebuilt them). Compare (`/medicines/compare`) and wishlist stay. |
| Kept | cart, request, rx-order, scan-prescription, final-quote, insurance-decision, order-confirm, payment, order-tracking, reorder, pharmacist-chat/chat, wishlist, product-detail | — | Journey steps. **Confirm (later, with the owner):** `request`, `rx-order` and `scan-prescription` look like three entries to one "order with a prescription" flow; not merged here because it is the priority journey. |

Result: app 21 → 18; web 22 → 16.

## 4. Nursing and home care (priority) — no merge
All screens stay (`/nursing/**`, web `/home-care/**`). The SEO page `/home-nursing/[citySlug]` stays static.

## 5. Orders, returns, payments, cart — no merge
`/orders/**` (web, including offers and negotiation), `/returns/**`, `/payments/result`, `/cart/**` are journey steps of pharmacy. `/payments/*` and `/payments` already redirect.

## 6. Insurance: 10 / 13 → 5 / 5 (not a priority service)

| New screen | Old routes (app) | Old routes (web) | Old becomes | What it is |
|---|---|---|---|---|
| `/insurance` Hub | `/insurance/hub`, `/insurance/policy-detail`, `/insurance/network-providers`, `/insurance/claims` list, `/profile/insurance` | `/insurance`, `/insurance/policy-detail`, `/insurance/network-providers`, `/insurance/claims`, `/insurance/benefits`, `/insurance/refunds` | redirect (`?tab=`) | Tabs **Policy · Benefits · Claims · Refunds (web) · Network**. Where the patient chooses an insurer (open owner question) is the Policy tab. |
| `/insurance/add-policy` | same | same | keep | Form (OCR extract stays). |
| `/insurance/coverage-check` | `/insurance/coverage-check`, `/insurance/benefits-summary` (already a redirect) | `/insurance/coverage-check` | keep | "Does my insurance cover this?" |
| `/insurance/submit-claim` | same | same | keep | Form. |
| `/insurance/requests/[requestId]` Request | `/insurance/approval-pending`, `/insurance/copay`, `/insurance/payment-split` | same three (web already has the request page) | redirect | One page for one insurance request; its state decides what shows: pending → approved → co-pay → accept self-pay. All read `/insurance/requests/:id`. Amounts and status only from the backend. |

## 7. Loyalty, offers, programs: 8 / 9 → 4 / 4
- **Loyalty hub** (`/loyalty`; app `/loyalty/hub`): tabs **Rewards · Challenges (health-habit only, decision 9) · Invite friends** (old `referrals`) and the points history. Redirects: `/loyalty/rewards`, `/loyalty/challenges`, `/loyalty/referrals`. `/loyalty/leaderboard` is **removed** (decision 2). 5 / 5 → 1 / 1.
- **Offers**: list and detail stay (2 / 2).
- **Programs**: web `/programs` and `/programs/active` read the same endpoint; one `/programs` (web 2 → 1; app `/programs/active` stays 1).

## 8. The rest

| Area | Proposal | Result |
|---|---|---|
| Maternity | Web becomes the app's structure: hub with sections **Pregnancy · Baby growth · Ovulation** (the app already redirects its trackers to the hub); setup stays. Web `/maternity/tracker`, `/maternity/baby-growth`, `/maternity/ovulation` → `/maternity?tab=`. | app 2 → 2; web 5 → 2 |
| Nutrition | Hub with tabs **Today (meals, water, summary) · Plan · Target**; "log a meal" stays a form. Web `/nutrition/daily-tracker`, `/nutrition/plan`, `/nutrition/body-target` → hub tabs; app `/nutrition/daily-tracker`, `/nutrition/body-target` → hub tabs. (`GET /nutrition/plan` is a reviewer item: the Plan tab hides until it lands.) | app 4 → 2; web 5 → 2 |
| Emergency | Decision 14: one **Emergency** screen = dial 997 (`tel:`) + "send my location to my emergency contacts" (contacts: the Medical-profile screen, MERGE_MAP.md §7). `/emergency/sos-active` and `/emergency/tracking` are removed with the ambulance system; web `/emergency` (active-request list) → the one screen. | app 3 → 1; web 4 → 1 |
| Account and addresses | One **address book** (`/profile/addresses`) with a pick mode (`?select=1`) replaces `/delivery/address-select` (app and web); app keeps `/shared/location-picker` as the "pick on the map" step. Web `/profile/edit` edits the **medical** profile (`/medical-profile`): it redirects to `/health/profile` (MERGE_MAP.md row "Medical profile"). Profile screen stays. | app 4 → 3; web 4 → 2 |
| Support | Web `/support` (FAQ + my requests) and `/settings/help` are the same screen (MERGE_MAP.md §3): `/support` → `/settings/help`; `/support/chat` and `/support/ticket` stay as the flow screens. | app 2 → 2; web 3 → 2 |
| Articles | List with tabs **All · Saved** (old `bookmarks`); detail stays. Community is **removed** (decision 1; doctor-authored articles live in `/articles`). | 5 → 2 (both); community 2 / 2 → 0 / 0 |
| Notifications inbox, reviews, map | Unchanged (web `/notifications/settings` is in MERGE_MAP.md §3). | same |
| Voice (`/voice`) | **confirm:** a mic input of the AI assistant, not a destination. Proposal: removed as a screen; the assistant (`/ai`) gets the mic button. | app 1 → 0; web 1 → 0 |
| App legal (`/privacy`, `/terms`) | → `/settings/about` (MERGE_MAP.md §3). Web `/privacy`, `/terms` stay (public legal URLs). | app 2 → 0 |
| Static public pages (web) | Doctor, specialty/city, lab/radiology/city, home-nursing/city, services, pharmacies/city, condition, facility pages are SEO landing pages: classified static, not user screens, no change. | — |
| First-run (Batch 0) | Welcome, language, permissions, onboarding, auth screens: first-run steps, no change. | — |

## 9. Decisions 24 to 26 as UI work (for the batches that own the screens)

**Decision 24, doctor chat only in a booking.** One thread screen (§1) with:
- Entry only from a booking (appointment detail) or a notification about it; the `/chat` list is removed. This changes MERGE_MAP.md §7 answer 5: web `/ai/chat-doctor` no longer redirects to `/chat` but to the bookings list (`/appointments`).
- **Online consultation:** composer with text, voice note, image, file, and the call button (one call, camera and microphone on/off). **Clinic or home visit:** composer with text, image, file only, no call and no voice note.
- Every thread shows "for emergencies call 997" (a `tel:` link).
- After the window the thread is **read-only** with a "book a follow-up" button (opens the booking with `?followUp=`). The window (72 h after completion, extendable once, closable early) and which composer parts are allowed come **from the server** with the thread; the screen never computes 72 h itself. Until that field exists: Needs-review line (backend), and the composer follows the booking type.
- Family chat, pharmacist chat (bound to an order) and support chat are not doctor chat and stay.

**Decision 25, payment method by service.**
- Online consultation, home doctor visit, home nursing: the payment step has **no cash option**; only online methods. Clinic visit: online or pay at the clinic.
- Pharmacy: online is the default; "cash on delivery" shows **only when the server says it is allowed for that order** (a field in the order/quote answer). The screen does not compute the conditions (no prescription item, no insurance, cap, completed order, pharmacy switch).

**Decision 26, cancel and refund text from the server.**
- Cancel and refund text on booking and order screens (consultations, home visit, nursing, diagnostics, pharmacy order, payment, terms) is shown from the server (the rule and the refund now). The hard-coded 12 / 24 h and 4 / 24 h copies are removed when backend item D-26 lands; until then they stay and each screen gets one Needs-review line. No screen computes a refund.

## 10. Questions for the reviewer (rows marked confirm)
1. Is the follow-up booking payload the same as a normal booking (§1)? Is `clinic-confirm` only the confirmed state of `booking-status`?
2. Do `sample-tracking` and `technician-tracking` read the same order (§2)? What is web `/diagnostics/labs/book`?
3. Are web `waiting-for-pharmacy` and `broadcast-status` the same state (§3)?
4. Voice: confirm it is only a mic input of the assistant (§8).
5. Insurance: is the Policy tab the right place to choose the insurer (§6)?

## 11. Answers (lead reviewer, delegated by the owner, 2026-10-06)

**Rule for every "confirm" row:**
- Merge only when, while implementing, you see that both screens read the same record through the same endpoint.
- If they do not, keep them separate and add one Needs-review line. Never change a payload to make two screens fit one.

1. **Follow-up and clinic-confirm:** approved under the rule above.
   - A follow-up is a booking with `followUp=<appointmentId>`. If the follow-up endpoint needs a different payload, keep the follow-up screen and send a Needs-review line.
   - `clinic-confirm` merges into `booking-status` only if it shows the same appointment.
2. **Sample and technician tracking:** approved under the rule.
   - Web `/diagnostics/labs/book`: if it posts to the same checkout as `/diagnostics/checkout`, redirect it there; otherwise keep it and add a Needs-review line.
3. **`waiting-for-pharmacy` and `broadcast-status`:** approved under the rule.
4. **Voice:** approved. Remove it as a screen; the assistant gets the mic button.
5. **Insurer choice:** yes, in the Policy tab.

**Also approved:** pharmacy `request`, `rx-order` and `scan-prescription` become **one** "order with a prescription" screen with three ways in (photo, upload, type the names), in Batch 14. The steps after it (offers, payment, tracking) do not change.
