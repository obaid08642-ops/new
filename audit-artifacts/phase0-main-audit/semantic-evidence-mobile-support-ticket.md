# Semantic evidence — Mobile Support Ticket

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/support/ticket.tsx:25–30` reads `/support/tickets`, but any failure becomes an empty list and there is no visible retry/error/stale state. The response is untyped and the screen does not distinguish unauthorized, network failure, no tickets or backend outage.

The “+ جديد” action routes to generic `/support/chat` (`:43–52`) rather than a ticket creation contract. Every ticket card also routes to the same generic chat without passing `t.id` (`:66–70`), so the selected ticket, conversation, ownership and service context are lost. There is no ticket detail, status transition, message history, attachment context, assignment, SLA, close/reopen, reply, escalation, notification or receipt workflow.

Ticket status/color/subject/date/last update are read directly from raw fields with defaults (`:66–96`); `statusColor` is accepted from server data without validation, and missing values render “مفتوح”/dash fallbacks that may imply state not proven by the backend. No pagination, refresh, deduplication or identity/ownership assertions are visible. No Phase 0 remediation was made.
