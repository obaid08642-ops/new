# Ordering UX spec: labs, radiology, nursing, doctors, pharmacy (review session, 2026-10-16)

This is the companion to `ORDERING_MODEL_2026-10-16.md` (gap map and phases). It is the **binding UX and behaviour spec** for phases M0–M8.

**The owner approved (2026-10-16):**
- the marketplace ordering model;
- the 4 open decisions:
  1. charge at booking with automatic refunds (card hold only for ASAP);
  2. a cash price per mode now, network prices later;
  3. Best-match weights editable in the admin;
  4. ASAP stages 3 → 5 → 8 km at 3 minutes each, editable;
- gender preference for nurses and technicians.

## 1. Principles (apply to every service)
1. **Context first, never a blocking quiz.** Three facts decide what a patient may see: **where** (home / I'll go), **who pays** (an insurance class / cash) and **for whom** (self / family member). They are known before the first screen: they come from the profile (default address, saved insurance, self). They show as one **context bar** at the top of every service screen, for example `📍 البيت – حي النرجس · 🛡️ بوبا – ذهبي · 👤 أنا`. One tap changes any of them. Lists, prices and coverage recompute at once. A new patient with nothing saved is asked once, in a bottom sheet, with "skip" allowed.
2. **Service first, provider second, for labs, radiology and nursing.** Patients arrive with *what* they need (a doctor's order, a symptom, a checkup), not with a lab's name. Doctors stay **doctor-first** (decided, F). Pharmacy stays **broadcast** (the request goes out and pharmacies answer with offers). Provider-first browsing for labs and radiology stays available as a secondary path ("Browse labs").
3. **Never an empty dead end.** Every filter result that would be empty offers the nearest way forward: "No home service for this test in your area → 3 labs within 5 km do it at the lab", or "request offers" (a broadcast). The admin sees every empty result as a coverage gap.
4. **One price the patient trusts.** Before a provider is chosen, a service shows **"from X SAR"**: the lowest total price among providers that fit the context, with the home fee included when "at home" is set, and the count of providers. **Not a range** ("40–220" scares and confuses). After a provider is chosen, the exact total shows: items + home fee − estimated insurance share. **The price is locked at booking.**
5. **Insurance is an estimate until approval, and the screen says so.** It shows per item: "covered", "likely covered, needs approval", or "not covered" with the cash price. The patient's share is "estimated". The final share comes with the approval, and the patient chooses again if it changes (D).
6. **Every step can be undone and every wait has a clock.** Waiting for a provider to confirm, for approval or for an ASAP match always shows a countdown and what happens when it ends (auto-refund, alternative, earliest slot).
7. **Inside the app only.** No phone numbers either way. Chat and calls are in-app. Before arrival the patient sees the provider's photo, name, licence and the arrival code.

## 2. The flow, per service

### 2.1 Labs and radiology (one engine)
1. **Entry:** lab or radiology home, search, a "Book" button on a test or scan page, **"Order" on a doctor's medical order**, or a **photo of a paper order** (the AI scanner reads items, the patient confirms; a low-confidence reading becomes a broadcast for priced offers).
2. **What:** tests and scans with checkboxes, each with "from X SAR", preparation (fasting 8 h…) and turnaround. Packages show their contents. Items from a doctor's order are pre-ticked and can be unticked ("later").
3. **Where:** comes from the context bar.
   - Facility-only items (MRI, CT) carry a "at the centre only" label even when "at home" is set.
   - A mixed basket is **split automatically** into "At home: 3 items" and "At the centre: 1 item" on one screen. The patient sees two bookings, one checkout and one payment, with separate statuses after.
4. **Who provides:**
   - a **"Best match for you"** card covering all items: in network for the patient's class, the nearest or fastest, rating and reliability. It shows the total, the estimated share, the distance, the earliest time and the turnaround.
   - Under it, **"Compare yourself"**: a list sorted by cheapest / nearest / fastest result / rating, with filters for in-network, home, open now and gender of staff.
   - If no single provider covers every item, a **suggested split** ("Lab A: 4 items, Lab B: 1 item, total …").
5. **When:**
   - At home: **2-hour windows** for the next 3 days, plus **"As soon as possible"** (a broadcast to in-area providers that set auto-accept; 3 → 5 → 8 km with a visible timer; then the earliest window is offered).
   - At the centre: a **slot** where the provider uses slots, or **walk-in** with a QR code and opening hours.
6. **Confirm and pay:** items, place, staff gender preference, preparation, price lines (items, home fee, estimated insurance share, total) and the patient's doctor's order (attached automatically, or upload it, which is required for insured labs and radiology). **Pay** with Moyasar on Nabd Plus pages. Insured home visits **are dispatched only after approval**. Facility slots may be booked while the approval runs. Packages, checkups and the home fee are cash unless approved, and the screen says so before payment.
7. **After:**
   - preparation reminders (the night before for fasting, and again in the morning);
   - live tracking of the technician with the arrival code (4 digits, shown to the patient, typed by the technician);
   - results in "My records" as values with reference ranges and **trends** across past results, with "Discuss with a doctor" (opens an instant consultation with the result attached);
   - rating.

### 2.2 Nursing and home care
- Service first (wound dressing, injections, IV, vital signs, elderly care by hours/days).
- Each service shows duration, what the patient prepares, and whether a doctor's order is needed (injections and IV need one).
- **Staff gender preference** is a filter and a booking field.
- Repeat services (dressings every 2 days, a course of injections) create a **series** from the doctor's order (sessions with duration). One checkout pays the series or each session; it can be cancelled per session.
- Booking a person shows the photo, licence (SCFHS), languages and rating; nurses never show phone numbers.
- ASAP works as for labs.

### 2.3 Doctors (doctor-first, decided)
- A list with filters: specialty, mode (online / clinic / home), in-network for the patient's class, gender, language, available today, price.
- Each doctor declares modes, price per mode and accepted insurers and classes **per mode**.
- **"Instant consultation"** at the top of a specialty: a broadcast to online doctors of that specialty. The first to accept gets the call within N minutes, otherwise the patient is offered the earliest slot or a refund.
- After the visit, the doctor writes the **structured medical order** (medicines, labs, radiology, nursing, sessions). It reaches the patient (notification, Home card, "My medical orders") with an **Order** button per group that opens the right flow pre-filled. The doctor never picks the provider.

### 2.4 Pharmacy (broadcast, unchanged)
- Insurance or self-pay is chosen before the request; pharmacies answer with priced offers (in network for insured requests).
- Each pharmacy declares its own couriers or pickup only.
- The rest follows the decisions already taken (order chat, cart without prices, the AI scanner, the Rx rule).

## 3. What providers declare (and how to make it easy enough that they do it)
Providers will not fill 300 items × 27 insurers × 4 classes by hand. The model must be **inherited with exceptions**:
1. **At the provider level, once at onboarding:**
   - modes offered (home / facility);
   - home-visit fee and radius;
   - accepted insurers and classes (multi-select per company);
   - auto-accept on/off;
   - working hours or slots;
   - staff genders available.
2. **Per item, defaults inherited**, with an override only where it differs: price per mode, home allowed (radiology home only for portable types, enforced), "not covered by X", turnaround, preparation text (from the national catalogue, editable).
3. **Bulk tools:**
   - pick items from the national catalogue;
   - apply one price change to many;
   - CSV import and export;
   - copy settings from mode to mode.
4. The provider app shows **a completeness score** ("70%: add prices for 12 tests") and a preview of how patients see the provider.

## 4. Risks and how this spec handles them

| Risk | Where it bites | Handling |
|---|---|---|
| Too few providers early (empty results) | filters return nothing, patients leave | Principle 3 alternatives; broadcast for offers; admin coverage-gap report by area and item; "notify me when available" |
| Stale prices or availability | the patient books, the provider cannot do it | price locked at booking; the provider must confirm within N minutes or it is auto-cancelled + **full automatic refund + the next best provider offered**; reliability score (acceptance, on time, cancellations) lowers ranking |
| Insurance estimate wrong | disputes, unpaid shares | "estimated" everywhere; final share after approval; per-item choices on partial approval (pay the difference / only covered items / cancel free); the patient never pays the insured part twice |
| Approval slow or expiring | home visit waits; approval expires before the visit | home visits dispatch only after approval; a status clock; a warning when the approval expires before the appointment, with "rebook earlier" |
| Mixed basket split fails halfway (one provider declines) | half an order done | each booking has its own status and its own refund; the declined part offers the next provider automatically |
| Refund takes days on cards | patient frustration | say the refund time at cancellation (Moyasar card refunds take some days); auto-refund starts at once; no patient wallet (owner decision 7A) |
| ASAP never matched | patient waits forever | stage timer, then the earliest window; at most 9 minutes for 3 stages (editable) |
| Safety at home | patient and staff safety | photo, name and licence before arrival; arrival code; gender preference; in-app chat and calls only; emergency button in the visit screen |
| Wrong item from a photo | wrong test done | AI reading always confirmed by the patient; low confidence goes to a broadcast where the provider confirms items before pricing |
| Doctor's order missing or expired | insurer rejects; illegal service | required for insured labs/radiology and for injections/IV; validity shown; expired orders cannot be used |
| Provider data burden | providers do not complete their profile | inheritance + bulk tools + completeness score (§3) |
| Performance of matching | slow lists | geo index on provider location + coverage; precomputed per-area provider sets; cache "from X" prices by area for 10 minutes |
| Privacy (PDPL) | results and orders are health data | results visible to the patient and to whom they share; providers see only their booking; audit trail (Phase 23) |

## 5. How competitors do it (patterns, not copies)
- **Lab-at-home apps** (the common pattern in India, the Gulf and Egypt): **test-first**, a "starting from" price, home collection as the default, a time window, then a lab or technician assigned. Weak spots we fix: they hide the lab choice, show no insurance coverage per test, and give no clock on confirmation.
- **Doctor marketplaces** (doctor-first): a list with filters (specialty, area, insurance, price) and booking by slot. Weak spots: insurance is shown per doctor only, not per mode, and they have no structured order that flows into lab and radiology booking. We fix both.
- **Pharmacy broadcast** (request, then offers): we already do it; the generalisation to labs and radiology for photo orders is our advantage.

Our edge:
- one context bar;
- per-item coverage;
- the doctor's order flowing straight into booking;
- a smart default plus a full comparison;
- clocks and automatic refunds on every wait.

## 6. Screens (M0 boards must cover, web and app, six languages, dark mode)
1. context bar and its bottom sheet;
2. service home (lab, radiology, nursing) with search, packages and "from X";
3. item page;
4. basket with the automatic split;
5. Best match + Compare list + split suggestion;
6. time picker (windows / ASAP with timer / slots / walk-in QR);
7. confirm and pay;
8. waiting states (provider confirmation, approval, ASAP) with clocks;
9. partial-approval choice;
10. booking status and tracking with the arrival code;
11. results with trends;
12. My medical orders (and the doctor's composer);
13. instant consultation;
14. provider declaration screens (onboarding, items, bulk tools, completeness);
15. admin: coverage gaps, weights, ASAP stages, confirmation deadline.
