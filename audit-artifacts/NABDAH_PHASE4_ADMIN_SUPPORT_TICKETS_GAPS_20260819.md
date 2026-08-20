# Phase 4 Admin Dashboard — support ticket supervision gaps

## Confirmed positive behavior

The page loads server tickets, uses explicit reply/status endpoints and exposes loading/error/empty states rather than generating support conversations locally.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P1** | Ticket lifecycle can be advanced or resolved without required owner, reason, evidence or verification | “Start” and “Resolve” immediately PATCH status; UI has no assignee, SLA timer, resolution category, internal notes, patient/provider confirmation, linked incident or reopening/escalation workflow. | Implement a server-owned support-case state machine with assignee/team, priority/SLA, reason/resolution codes, evidence, requester notification/confirmation, reopen/escalate and audit history. |
| **P1** | Broad ticket rows and embedded threads expose user identity/content without visible task-based scope | List/thread includes subject, name/phone/ID, role, category and all thread text for every rendered admin, without masking, assignment gate, sensitive-content classification or view audit. | Enforce role/team/case-based server filtering, redact/minimize PII/PHI, require just-in-time reason for sensitive content and audit all views/downloads. |
| **P1** | Replies are free text with no safety, privacy, template or delivery/reconciliation control | Any admin can send raw message; page has no approved response template, disclosure warning, attachment handling, outbound delivery status, idempotency or failed-send recovery. | Add approved templates/guardrails, message classification, outbound channel consent, idempotent delivery/read state, retry and audit. |
| **P1** | Ticket review has no search, pagination, date/assignee/SLA filter or activity context | The page relies on a single list response and status filter only, limiting safe triage and investigation. | Provide server-filtered/paginated case queues with assignee, priority, SLA, category, date and source; distinguish stale/error/empty results. |
| **P1** | Support workflow is Arabic-only and lacks accessible status/PHI warnings | Status, reply, identity and high-priority controls have no six-language/RTL-LTR reviewed accessibility coverage. | Deliver reviewed six-language accessible support UI with confidentiality and escalation labels. |

## Decision

Admin support supervision is **FIX/BLOCKED** for governed resolution. Endpoint connectivity alone is insufficient while case ownership, SLA, minimum data, message safety and auditable lifecycle controls are absent.
