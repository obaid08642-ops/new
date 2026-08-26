# Patient Web: Health read summaries — manual review

This source-only artifact supports **only** the explicitly mapped Mobile rows below. It does not close the remaining health rows, and it does not validate upstream ownership, clinical authority, device provenance, data freshness, consent, or runtime behavior.

| Source | Evidence | Bounded observation |
|---|---|---|
| `health/chronic-diseases/page.tsx:12` | Protected GET, display cards, no form/action CTA. | Read-only chronic-condition summary; no add/edit/remove/clinical review workflow evidenced. |
| `health/chronic-medications/page.tsx:12` | Protected GET, medication/dose/frequency/refill display, no form/action CTA. | Read-only medication summary; no adherence, refill, update or prescribing workflow evidenced. |
| `health/vitals/page.tsx:12` | Protected history read and explicit `vitalsHistoryReadOnly` notice. | No manual add/edit/delete/import/share/threshold action evidenced. |
| `health/trends/page.tsx:13` | Protected trends/cards, no action CTA. | No methodology, clinician interpretation, anomaly escalation or corrective action evidenced. |
| `health/emergency-contacts/page.tsx:12` | Protected contact summaries with masked phones only. | No add/edit/delete/call/escalation CTA evidenced. |
| `health/sleep/page.tsx:12` | Protected sleep-history cards, no action CTA. | No logging/editing/device sync/recommendation intervention evidenced. |
| `health/score/page.tsx:12–19` | Protected score/status/component display. | No methodology/drill-down/correction/care escalation CTA evidenced. |
| `reminders/page.tsx:13–28` | Protected medication-reminder/today-dose summary. | No create/edit/delete/mark-dose-taken/snooze/notification-control CTA evidenced. |

No runtime, Backend, device, clinical, or ownership claim is made from this source-only evidence.

## Mapped Mobile rows

| Mobile row | Web source/route | Classification | Source-bounded disposition |
|---|---|---|---|
| PM-101 chronic disease | `/{locale}/health/chronic-diseases`; `health/chronic-diseases/page.tsx:12` | `STATIC_MATCHED_PARTIAL` | Authenticated condition read exists; no add/edit/remove or clinical-review CTA is present. |
| PM-102 chronic medications | `/{locale}/health/chronic-medications`; `health/chronic-medications/page.tsx:12` | `STATIC_MATCHED_PARTIAL` | Authenticated medication/refill facts are read-only; no adherence/refill/update/prescribing CTA is present. |
| PM-105 emergency contacts | `/{locale}/health/emergency-contacts`; `health/emergency-contacts/page.tsx:12` | `STATIC_MATCHED_PARTIAL` | Masked contacts are shown, but no add/edit/delete/call/escalation CTA exists. |
| PM-111 medication-reminder add | No add/reminder mutation surface located; `reminders/page.tsx:13–28` is list/summary only. | `MISSING_CAPABILITY` | No creation form, idempotent mutation, schedule validation, consent, or delivery state is evidenced. |
| PM-112 medication-reminder list; PM-116 reminders | `/{locale}/reminders`; `reminders/page.tsx:13–28` | `STATIC_MATCHED_PARTIAL` | Protected reminder and today-dose summaries exist; there is no mark-taken/snooze/edit/delete CTA. |
| PM-115 refills | `health/chronic-medications/page.tsx:12` exposes an optional refill date only. | `MISSING_CAPABILITY` | A displayed date is not refill eligibility, request, pharmacy selection, payment, or prescription workflow. |
| PM-118 sleep score; PM-119 sleep tracker | `/{locale}/health/sleep`; `health/sleep/page.tsx:12` | `STATIC_MATCHED_PARTIAL` | Sleep readings are displayed only; no logging, correction, device sync, recommendation or intervention CTA. |
| PM-121 health trends | `/{locale}/health/trends`; `health/trends/page.tsx:13` | `STATIC_MATCHED_PARTIAL` | Trend cards show values/direction, not methodology, interpretation, anomaly escalation, or corrective action. |
| PM-122 vitals log | `health/vitals/page.tsx:12` explicitly describes history as read-only. | `MISSING_CAPABILITY` | No manual add/edit/delete/import or clinical alert threshold flow is evidenced. |
| PM-123 vitals | `/{locale}/health/vitals`; `health/vitals/page.tsx:12` | `STATIC_MATCHED_PARTIAL` | Protected vital-history display exists; source does not establish provenance, ownership or clinical action. |
| PM-124 wearables | No Web wearable/device connection surface was located in the health route tree. | `MISSING_CAPABILITY` | No device authorization, sync, data provenance, revocation or error-handling workflow is evidenced. |

## Remaining boundary

No tracker claim is made for health routes not listed above. They remain `MANUAL_MAPPING_REQUIRED` until the route and CTA are read and mapped individually.
