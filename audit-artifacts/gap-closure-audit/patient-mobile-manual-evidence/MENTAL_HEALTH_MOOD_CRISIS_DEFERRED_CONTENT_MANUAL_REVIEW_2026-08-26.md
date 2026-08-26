# Patient Mobile: Mental-health mood, crisis and deferred content — manual review

## Scope boundary

This read-only source review covers all eight Mental Health inventory routes. It does not establish clinical accuracy, screening validity, therapist credentials, crisis detection, emergency availability, support-line geography, message confidentiality, authorization, retention, or any clinical/operational response.

| Reviewed source | Scope |
|---|---|
| `app/mental-health/index.tsx` | Redirect to hub |
| `app/mental-health/hub.tsx` | Mental-health navigation and notices |
| `app/mental-health/mood-journal.tsx` | Mood journal entry/history |
| `app/mental-health/crisis-support.tsx` | Urgent contacts/call actions |
| `app/mental-health/breathing.tsx` | Redirect/deferred content |
| `app/mental-health/meditation.tsx` | Redirect/deferred content |
| `app/mental-health/self-assessment.tsx` | Redirect/deferred assessment |
| `app/mental-health/therapist-match.tsx` | Redirect to consultations |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-MH-001 | `STATIC_MATCHED_PARTIAL` | `mental-health/mood-journal.tsx:43–75, 96–125` | Mood journal reads and posts personal mood/stress/sleep/note/tags and shows server-refreshed history, but there is no source evidence for PHI classification, encryption/retention, owner/family access, crisis-risk detection, clinical review, deletion/export or clinician escalation. | Mental-health data governance and access contract, retention/deletion/export policy, risk/escalation model, ownership tests and clinical review. |
| PM-MH-002 | `CONFIRMED_DEFECT` | `mental-health/crisis-support.tsx:41–54, 63–80` | Crisis screen hard-codes phone actions including `911` while separately labeling a Saudi health line, with no region policy, call initiation/connection confirmation, availability check, emergency-location handoff, user risk assessment or alert delivery. It stores contacts but has no consent/verification/escalation evidence. | Jurisdiction-aware crisis directory and reviewed safety policy; explicit call/error and location-sharing state; crisis contact consent/verification/notification escalation; runtime operational validation. |
| PM-MH-003 | `MISSING_CAPABILITY` | `mental-health/breathing.tsx:1–6`; `mental-health/meditation.tsx:1–6`; `mental-health/self-assessment.tsx:3–6`; `mental-health/therapist-match.tsx:1–6` | Breathing, meditation and diagnostic-style self-assessment are intentionally redirected/deferred; therapist matching is replaced by generic consultations. There is no dedicated clinically reviewed content, self-assessment, risk score, matching rationale or therapeutic pathway. | Approved product scope and clinically governed content/assessment/matching contracts, informed-consent/safety escalation, credentials and runtime validation. |
| PM-MH-004 | `INSUFFICIENT_EVIDENCE` | `mental-health/hub.tsx:10–54`; `mental-health/index.tsx:1–7` | Hub routes mood, generic consultations and urgent help and displays non-diagnosis notices. Static source cannot prove screen guards, crisis priority, service/provider appropriateness, booking reason privacy or that the notices match localized legal/clinical policy. | Routing/guard policy, clinical/legal content governance, consultation service contract and owner/guest/minor runtime tests. |

## Conclusion

The Mental Health sources intentionally avoid several unsafe features by redirecting them, which is preferable to fabricated therapy content. However, mood data and crisis-contact actions remain high-risk and are not production-validated; the hard-coded emergency routes and missing regional/safety governance prevent any readiness claim. Manual source review is complete only for the eight inventory paths.
