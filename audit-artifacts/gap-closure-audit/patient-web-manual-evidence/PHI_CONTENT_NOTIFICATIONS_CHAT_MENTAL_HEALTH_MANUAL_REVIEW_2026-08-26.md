# Patient Web: PHI, content, notifications, chat and mental health — manual CTA→contract review

## Boundary

This source-only review covers the health hub and report list, insurance summary, article list/detail, notification-settings summary, chat-thread summary, and mental-health dashboard. It does not validate clinical accuracy, patient ownership, data freshness, consent, retention, provider/payer actions, notifications delivery, crisis response, or runtime behavior.

| ID | Surface / source evidence | Classification | Finding and closure evidence |
|---|---|---|---|
| PW-PHI-001 | Health hub: `health/page.tsx:35–50` uses an authenticated vital-summary read, then links to related health surfaces and renders vital cards. | `STATIC_MATCHED_PARTIAL` | The page provides a protected read and unavailable/empty states. It has no source evidence for manual vital entry/edit/delete, device import consent, threshold/clinical escalation, provenance/freshness, or sharing/export. A displayed vital is not a clinical decision or authoritative record without Backend/Data reconciliation. |
| PW-PHI-002 | Health reports: `health/reports/page.tsx:10` reads report summaries and renders title/type/doctor/facility/date cards only. | `MISSING_CAPABILITY` | No report detail, result body, download, verification/provenance, share/revoke, correction/dispute, clinical acknowledgement, or PHI audit CTA is evidenced. |
| PW-INS-001 | Insurance: `insurance/page.tsx:19–38` fetches policy, benefits and claims, but parses/renders only policy summary and claims. | `CONFIRMED_DEFECT` | `benefitsResponse` is required for page success yet its payload is never parsed or displayed. The surface has no coverage check, benefit detail, payer decision, co-pay, policy update/upload, claim submission/dispute, payment split, or refund CTA. A policy/claim status badge is not a coverage decision. |
| PW-CONTENT-001 | Articles list: `articles/page.tsx:11` supports public search/category and detail links; article detail: `articles/[slug]/page.tsx:11` renders title/excerpt then explicit `bodyHidden`. | `CONFIRMED_DEFECT` | Public article detail is a placeholder-like summary without article body, author/reviewer, update date, citations, clinical disclaimer by topic, related care escalation, or publication-state/SEO contract evidence. It must not be treated as clinically informative content or a complete SEO detail page. |
| PW-NOTIFY-001 | Notification settings: `notifications/settings/page.tsx:12–31` reads booleans and renders status labels; emergency is a locked required display. | `MISSING_CAPABILITY` | There are no setting controls, update contract, channel/device permission status, delivery/audit/opt-out logic, or patient choice workflows. A displayed enabled/disabled label is not notification preference management. |
| PW-CHAT-001 | Chat thread: `chat/[threadId]/page.tsx:12` reads thread/messages but shows only type/timestamp/deleted/attachment-hidden summaries and `bodyHidden`. | `MISSING_CAPABILITY` | The Web has no compose/send/reply/upload/download/read-receipt/provider-routing/escalation/disclosure CTA in the reviewed thread surface. It cannot be treated as patient-provider/support chat parity. Backend authorization and message privacy remain unproven. |
| PW-MH-001 | Mental-health hub: `mental-health/page.tsx:11` renders wellbeing aggregates and links only to breathing history, crisis contacts and meditation history. | `MISSING_CAPABILITY` | No mood entry, self-assessment, therapist match, therapy booking, live crisis escalation, emergency call/handoff, safety plan, consent, or clinical review workflow is evidenced. Aggregates must not be presented as care guidance without validated data and a safety policy. |

## Mapped Mobile rows in this wave

| Mobile row(s) | Web mapping | Disposition |
|---|---|---|
| PM-015 health tab | `/{locale}/health` | `STATIC_MATCHED_PARTIAL`; protected read hub only. |
| PM-117 health reports; PM-213/PM-216 report hub/view | `/{locale}/health/reports` | `MISSING_CAPABILITY`; summary list only. |
| PM-028 article detail | `/{locale}/articles/{slug}` | `CONFIRMED_DEFECT`; content body explicitly hidden. |
| PM-030 articles | `/{locale}/articles` | `STATIC_MATCHED_PARTIAL`; public list/search/detail handoff only. |
| PM-128 benefits; PM-129 claims; PM-132/PM-133 insurance | `/{locale}/insurance` | `CONFIRMED_DEFECT` for unrendered benefits and `MISSING_CAPABILITY` for actionable insurance journeys. |
| PM-154/PM-155 mental-health hub/index | `/{locale}/mental-health` | `MISSING_CAPABILITY` for active care/crisis workflow. |
| PM-231 notification settings | `/{locale}/notifications/settings` | `MISSING_CAPABILITY`; read-only labels. |
| PM-041 consultation chat; PM-238 support chat | `/{locale}/chat/{threadId}` summary surface | `MISSING_CAPABILITY`; not compose/escalation chat. |

No browser/device/build/live API test, user/PHI access, message action, notification delivery, clinical action, migration, merge, or deployment was performed.
