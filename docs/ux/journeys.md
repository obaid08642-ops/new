# 12.C4 — user journeys

The screen-by-screen documentation is `docs/audit/screens/`. This file is the
other half: what a person is trying to do, and which screens and states stand
between them and it.

The budgets below are not aspirations. §C4 asks for a time budget for the three
main flows per client, measured rather than asserted, so each carries the number
it was given and the number it actually has. A budget with no measured value is a
slogan, and the first honest thing to record is which ones have never been timed.

## Why journeys and not just screens

Screens are audited one at a time, which makes it easy to pass every screen and
still have a broken product. The three failures that screen-by-screen review
cannot see are all cross-screen:

- a flow that is fine until it crosses from an unauthenticated surface to an
  authenticated one and the state is lost;
- a step that can be reached two ways and behaves differently each way;
- an error that is handled on the screen where it occurs but leaves the person
  with no way forward.

Each flow below therefore records its entry points, its states, and the specific
way it fails, rather than a list of the pages it visits.

---

## Patient — flow 1: find a doctor and book

**Goal:** a patient with a symptom reaches a confirmed appointment.
**Entry points:** home service tiles; search; a direct `/consultations/doctors`
link from a shared page or a search engine.

| step | screen | state that must be handled |
| --- | --- | --- |
| 1 | home / search | no results; results where every doctor is unavailable |
| 2 | doctor profile | not signed in; profile incomplete enough that booking cannot proceed |
| 3 | slot picker | `available: false` rendered disabled and still present, never removed |
| 4 | booking form | mid-submit double tap; network failure after the slot was held |
| 5 | confirmation | slot released while the form was open, so the chosen time is gone |

**The one that matters:** step 5. A held slot expiring between choosing and
confirming is the single most common way this flow fails, and it is invisible to
a per-screen audit because both screens are individually correct.

**Time budget:** to be measured. Not yet timed.

## Patient — flow 2: manage an appointment

**Goal:** change or cancel something already booked.
**Entry points:** home "Continue"; Activity → appointments; a push notification.

**The one that matters:** the same appointment must look the same from all three.
A push notification that deep-links into a different state from the Activity list
is two implementations of one flow, and they will drift.

**Time budget:** to be measured.

## Patient — flow 3: get a prescription and fill it

**Goal:** a prescription issued by a doctor is dispensed without re-entering
anything.
**Entry points:** doctor consultation; Activity → prescriptions; pharmacy search.

**The one that matters:** the join between consultation and pharmacy. If the
prescription is not available as a first-class object when the consultation
closes, the patient is asked to retype it — and every step that asks a patient to
retype something is a step that loses people.

**Time budget:** to be measured.

---

## Provider — flow 1: accept and fulfil a booking

**Goal:** a provider takes an appointment and closes it with an outcome.
**Entry points:** dashboard; push; badge count.

**Time budget:** to be measured.

## Provider — flow 2: request a document or a review

**Goal:** the provider asks for what they need, and sees its status.
**Entry points:** dashboard; patient profile.

**Time budget:** to be measured.

## Provider — flow 3: settle earnings

**Goal:** a provider understands what they are owed and why.
**Entry points:** dashboard; earnings screen.

**The one that matters:** the number must be derivable from the underlying
records. A payout total that cannot be traced back to the appointments and
adjustments that produced it is not a financial feature.

**Time budget:** to be measured.

---

## Admin — flow 1: act on a flagged item

**Goal:** an operator reaches an alert, understands it, and acts.
**Entry points:** audit logs; broadcast monitor; a direct link from a report.

**The one that matters:** AdminGuard. Every `/admin` route is permission-gated, and
a guard that redirects to `/login?returnTo=…` loses the return path in any flow
that crosses a second gate.

**Time budget:** to be measured.

## Admin — flow 2: change brand or content

**Goal:** an operator changes something visible, and can see the result.
**Entry points:** theme control; articles; catalog governance.

**The one that matters:** the seasonal themes. `data-seasonal` is applied to
`<html>`, so it affects every admin surface at once, and the theme a person
selects is not the theme another person sees. Whether that is intended is a
question this document does not answer, and should.

**Time budget:** to be measured.

## Admin — flow 3: hand over to a colleague

**Goal:** another operator picks up exactly where this one stopped.
**Entry points:** audit logs; any in-flight record.

**Time budget:** to be measured.

---

## What is recorded as unmeasured, and why

Every budget above reads "to be measured". That is the accurate state: no flow in
this repository has been timed with a person, and asserting a number would be the
same class of defect as the lime primary button — a value presented as verified
because it is written down.

Measuring them requires a device or a person, and neither is available from a
terminal. The honest sequence is therefore: finish the flows, then measure, then
fill these in. Filling them in first would be a guess wearing a decimal point.
