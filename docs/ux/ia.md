# 12.C5 — Information architecture and content

**Status: drafted, awaiting the owner's written approval.**
Phase 12 rule: screens are rebuilt *from this document*, not from today's screens.
12.A11 does not start until this is approved in writing. Every rebuilt screen links
back to its section here.

This is a redesign, not a re-skin. The structures below are decisions, not
descriptions: where today's app has seven bottom tabs, this proposes four, and the
seven services that today sit in both the tab bar and the home page stop being
reachable two different ways.

---

## 0. What exists today (measured, not assumed)

| | Today |
|---|---|
| patient-app bottom tabs | **7** — Home, Consultations, Pharmacy, Diagnostics, Services, Health, Nursing |
| patient-web routes | **65** under `app/[locale]/` |
| provider-app | no tab bar; 8 role folders under `src/screens/` (ambulance, auth, doctor, facility, lab, nursing, pharmacy, radiology, shared) |
| admin pages | **54** under `src/pages/admin/` |
| locales | 6 — `ar, en, ur, hi, fil, bn` |

**The problem this document fixes.** patient-app gives seven services a permanent
place in the tab bar, and the home page then presents the same seven again as
sections. A user who wants pharmacy has two roads to the same place, one of them
permanent and one of them scrollable — and the seven tabs leave no room for a
search field, a cart badge or a profile affordance without dropping something.
Meanwhile 12.C2 counted **239 files importing a visual primitive directly** and
`no-raw-color` counts **9,404** hard-coded colours: the information architecture
and the visual debt are the same problem, because a screen nobody designed is a
screen nobody restyled.

---

## 1. App and site map

### 1.1 patient-app — bottom tabs: **4**, not 7

| # | Tab | Route | Reaches |
|---|---|---|---|
| 1 | **Home** | `/` | Everything below, in priority order |
| 2 | **Search** | `/search` | The one destination that used to be seven |
| 3 | **Activity** | `/activity` | Orders, bookings, prescriptions, results — in one timeline |
| 4 | **Account** | `/profile` | Profile, family, insurance, settings, language, theme |

**Removed from the tab bar:** Pharmacy, Diagnostics, Nursing, Consultations,
Services, Health. None of them is deleted — each becomes a Home section, and each
keeps its deep link (`/pharmacy`, `/diagnostics`, `/nursing`,
`/consultations/doctors`) so every existing bookmark and notification still lands
somewhere correct.

*Why:* a tab is a promise that the destination is one tap away and worth a
permanent slot. Seven slots spent on seven sibling services leaves none for search,
which is the only control that scales as the catalogue grows.

### 1.2 patient-app — app bar (header), top to bottom

1. Location (current city — real geolocation, falls back to the profile city)
2. Search entry (a field, not an icon: the field is the affordance)
3. Notifications, with a count badge when there is something new
4. Cart, with a count badge
5. Avatar → Account

Cart and notifications are **moved out of the tab bar** to make room. They are
tasks, not places; a task that is 90% of the time empty should not hold a
permanent slot.

### 1.3 patient-web — header

Left: wordmark → home. Centre: search field. Right: language, theme, Account.
On scroll past 72px the header condenses to the wordmark plus search, and the
scroll-driven glass treatment (12.A8) applies to the condensed bar only.

Below 760px the search field collapses to a search icon that expands in place.
The header never wraps and never scrolls horizontally.

### 1.4 patient-web — side menu

The side menu is **removed**. patient-web's catalogue is deep (65 routes) and a
side menu that must list all of it is a worse version of search. Category
navigation lives on the home page and in the search results; the header carries
only the four things that are always relevant.

### 1.5 provider-app

No tab bar, unchanged. Role folders stay, because a provider logs into one
discipline and the folder *is* the discipline. Navigation within a role is a
back-stack plus a role home, not a global menu.

### 1.6 admin

The 54 pages stay, grouped under the seven headings the plan already defines
(overview, people, care, commerce, content, platform, compliance). The grouping is
what 7B's per-screen permissions hang off, so a role sees its groups, not 54
links.

---

## 2. Home page — sections in order

Real data only. No section renders a placeholder; a section with no data is
absent, not empty.

| # | Section | Data source | Primary action |
|---|---|---|---|
| 1 | Search | — (the control) | Focus the field |
| 2 | Continue | The user's last incomplete action | Resume it |
| 3 | Actions | Anything needing the user: prescription to fill, result ready, copay due, booking tomorrow | Do it |
| 4 | Core services | The 4 highest-frequency services, from real usage | Enter the service |
| 5 | Specialists | Doctors, labs and pharmacies near the user, real geolocation | View |
| 6 | For you | Conditions and services matched to the user's profile and history | Explore |
| 7 | Offers | Only offers the user is actually eligible for | Claim |
| 8 | Reassurance | Delivery coverage, licence, privacy, support | — |

**"Continue" and "Actions" are new, and they are the point.** Today's home page
opens with a hero and then a catalogue. A returning user — the majority — has an
unfinished action, and today they have to go and find it. Two sections, both
data-driven, both empty on a first visit, put the returning user one tap from
the thing they came to do.

**"Continue" is a single card, never a carousel.** One unfinished thing, the most
recent. A carousel of unfinished things is a queue, and a queue on a home screen
is a to-do list the user did not write.

---

## 3. Per screen

Every screen carries four things: what it is for, what it shows and in what
order, its one primary action, and what was removed or merged into it.

### 3.1 Search

- **Purpose:** find anything, quickly.
- **Shows, in order:** the field (focused on arrival, with the previous query
  selected); recent searches; suggestions as you type; results grouped by type
  (services, medicines, doctors, labs, conditions, articles).
- **Primary action:** type. There is no submit button — results update as you type.
- **Removed:** the old "Browse by Category" grid as the *first* thing on the page.
  Categories become a filter row *under* the field, and the grid moves to a
  secondary position. Today a user has to choose a category before they can
  search; most searches are not category-first.
- **Merged:** the seven tab-bar entry points and the standalone category page.

### 3.2 Service home (pharmacy, diagnostics, nursing, consultations)

- **Purpose:** enter one service and act in it.
- **Shows, in order:** what needs doing (same Actions section, service-scoped);
  the service's own primary action; a short catalogue; recent activity in it.
- **Primary action:** differs per service — Shop (pharmacy), Book (consultations),
  Schedule (diagnostics), Request (nursing).
- **Merged:** today's pharmacy/diagnostics/nursing tab screens and their separate
  home-page cards. One service, one place, reached from Home, from Search, or by
  its old deep link.

### 3.3 Activity

- **Purpose:** everything the user has in flight.
- **Shows, in order:** upcoming (bookings, deliveries, collections), then results
  ready to read, then orders, then past.
- **Primary action:** open the next thing.
- **Merged:** orders, bookings, reminders and notifications — four destinations
  that today each have their own tab or screen and all answer "what is happening
  to me".

### 3.4 Account

- **Purpose:** identity, preferences, people, money.
- **Shows, in order:** profile; family; insurance and eligibility; payment methods;
  addresses; language; theme; notifications; privacy; sign out.
- **Primary action:** none. An account screen is navigation.
- **Merged:** today's profile, family, insurance, settings, notifications and
  reminders, which are six destinations for one job.

### 3.5 Product / medicine detail

- **Purpose:** decide whether to buy this.
- **Shows, in order:** name, image, price, availability near you, what it is for,
  ingredients, warnings, alternatives, reviews.
- **Primary action:** add to cart — or, for a prescription item, upload the
  prescription inline (12.C4, the one-page checkout).
- **Removed:** the second "add to cart" control at the bottom. One primary
  action, once.

---

## 4. Content style guide

### 4.1 Tone

Plain, specific, and never cheerful on a page about someone's health. No
exclamation marks. No "Oops". No apologising for an outage the user did not cause.

**Say what happened and what to do.** "We couldn't load your results. Try again, or
call the lab." — not "Something went wrong" and not "Sorry! 😕".

### 4.2 Short labels

| Instead of | Write |
|---|---|
| Diagnostic Bookings | Results |
| Home Nursing Care | Nursing at home |
| Browse services published by the nursing department | Nursing services |
| Comprehensive lab packages & medical imaging | Labs and imaging |
| Pharmacy & Medicines | Pharmacy |
| Appointments | Bookings |

Cap: **three words** for a tab, **six** for a section heading, **eight** for a
button. If a label does not fit, the thing it names is probably two things.

### 4.3 Button verbs

A button says what happens **when pressed**, in the user's words.

- ✅ `Book appointment` · `Add to cart` · `Upload prescription` · `Pay copay`
- ❌ `Submit` · `Continue` · `OK` · `Yes` · `Click here`

Never a bare verb with no object. Never a noun. "Save" is only allowed when the
thing being saved is named next to it.

### 4.4 Error messages

Four parts, always: **what happened**, **what the user can do**, **whether their
data is safe**. Never an error code in the visible text. Never a stack trace.

```
Couldn't load your results.          ← what happened
Your account is fine.                ← data is safe
Try again, or call the lab on 9200…  ← what to do
```

### 4.5 Empty states

An empty state has three parts: what will appear here, why it is empty, and the
one action that fills it. An empty state with only an illustration and "No items"
is a dead end.

| Screen | Empty state |
|---|---|
| Activity | "No bookings or orders yet. When you book a doctor or order medicine, it appears here." + **Browse services** |
| Search results | "Nothing matched «{query}». Try a shorter word, or browse by category." + **Categories** |
| Pharmacy orders | "No orders yet. Medicines you order appear here with their delivery status." + **Shop pharmacy** |
| Cart | "Your cart is empty. Prescriptions you upload go straight to checkout." + **Upload prescription** |

The empty state must never be the same illustration with a different word on it.
A6 shipped three distinct empty scenes for exactly this reason, and they are used
per intent: **first-run** (nothing has happened), **no-match** (a search found
nothing), and **cleared** (something was removed).

### 4.6 The six locales

Everything above is authored in `ar` first, then `en`, then `ur`, `hi`, `fil`, `bn`.

- **Right-to-left:** `ar`, `ur`. Layout mirrors; **nothing mirrors that is not
  directional** — a lab result, a dose, a price, a phone number and a chart axis
  all stay left-to-right inside an RTL page.
- **Per-locale font** (12.A5): Readex Pro with Noto Nastaliq Urdu for `ur`, Noto
  Sans Devanagari for `hi`, Noto Sans Bengali for `bn`, Noto Sans Arabic for `ar`.
  Only the active locale's face is downloaded.
- **Numerals:** Western digits in `ar`, as is standard in Saudi healthcare apps.
- **Length:** German-length expansion does not apply, but Arabic is *shorter* —
  do not pad to match English. Line lengths are set for the longest locale, not
  tuned per screen.
- **Mixed direction:** any string containing both scripts (a drug name in Latin
  inside an Arabic sentence) is wrapped so the browser does not reorder the
  punctuation.
- A missing key renders as the key itself, so 12.A4's coverage gate is the thing
  that keeps this section true.

---

## 5. What gets removed, in one place

So the removals are arguable rather than discovered later:

| Removed | Because |
|---|---|
| 7 bottom tabs → 4 | Search needs a permanent slot; the services are reachable and deep-linkable |
| Cart and notifications in the tab bar | Tasks, not places |
| patient-web side menu | A menu listing 90 routes is a worse search |
| "Browse by Category" as the first thing on search | Most searches are not category-first; it becomes a filter |
| Second "add to cart" on product detail | One primary action |
| Orders / bookings / reminders / notifications as four places | One "Activity" answers one question |
| `Sorry! 😕`-style errors | Four-part message instead |
| One illustration reused for every empty state | Three intents, three scenes |

---

## 6. Approval

The plan requires the owner's written approval of this document before 12.A11
starts. Two decisions in it are the owner's to make and are flagged rather than
assumed:

1. **Four tabs.** Fewer is better, but it removes permanent homes for Pharmacy,
   Diagnostics and Nursing. If pharmacy is the daily driver for this audience, it
   may deserve a tab back.
2. **The side menu goes.** If the catalogue is expected to be browsed by category
   more than searched, the menu should stay.

Once approved, 12.A11 rebuilds each screen against its section here, and every
rebuilt screen links back to the number it implements.
