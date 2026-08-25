# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_SUPPORT_TICKETS_GAPS_20260819.md`
- **Member SHA-256:** `b922f19a22b75cbfb3d4a88c7fcbec204bbe5d36dd5e83b7e956eb6e4562009b`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The page loads server tickets, uses explicit reply/status endpoints and exposes loading/error/empty states rather than generating support conversations locally.`
- `12: | **P1** | Broad ticket rows and embedded threads expose user identity/content without visible task-based scope | List/thread includes subject, name/phone/ID, role, category and all thread text for every rendered admin, without masking, ass`
- `13: | **P1** | Replies are free text with no safety, privacy, template or delivery/reconciliation control | Any admin can send raw message; page has no approved response template, disclosure warning, attachment handling, outbound delivery statu`
- `14: | **P1** | Ticket review has no search, pagination, date/assignee/SLA filter or activity context | The page relies on a single list response and status filter only, limiting safe triage and investigation. | Provide server-filtered/paginated`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — support ticket supervision gaps`
- `11: | **P1** | Ticket lifecycle can be advanced or resolved without required owner, reason, evidence or verification | “Start” and “Resolve” immediately PATCH status; UI has no assignee, SLA timer, resolution category, internal notes, patient/p`
- `12: | **P1** | Broad ticket rows and embedded threads expose user identity/content without visible task-based scope | List/thread includes subject, name/phone/ID, role, category and all thread text for every rendered admin, without masking, ass`
- `13: | **P1** | Replies are free text with no safety, privacy, template or delivery/reconciliation control | Any admin can send raw message; page has no approved response template, disclosure warning, attachment handling, outbound delivery statu`
- `19: Admin support supervision is **FIX/BLOCKED** for governed resolution. Endpoint connectivity alone is insufficient while case ownership, SLA, minimum data, message safety and auditable lifecycle controls are absent.`
### state_transitions
- `3: ## Confirmed positive behavior`
- `5: The page loads server tickets, uses explicit reply/status endpoints and exposes loading/error/empty states rather than generating support conversations locally.`
- `7: ## Confirmed defects`
- `11: | **P1** | Ticket lifecycle can be advanced or resolved without required owner, reason, evidence or verification | “Start” and “Resolve” immediately PATCH status; UI has no assignee, SLA timer, resolution category, internal notes, patient/p`
- `13: | **P1** | Replies are free text with no safety, privacy, template or delivery/reconciliation control | Any admin can send raw message; page has no approved response template, disclosure warning, attachment handling, outbound delivery statu`
- `14: | **P1** | Ticket review has no search, pagination, date/assignee/SLA filter or activity context | The page relies on a single list response and status filter only, limiting safe triage and investigation. | Provide server-filtered/paginated`
- `15: | **P1** | Support workflow is Arabic-only and lacks accessible status/PHI warnings | Status, reply, identity and high-priority controls have no six-language/RTL-LTR reviewed accessibility coverage. | Deliver reviewed six-language accessibl`
### payment_insurance_relevance
- `15: | **P1** | Support workflow is Arabic-only and lacks accessible status/PHI warnings | Status, reply, identity and high-priority controls have no six-language/RTL-LTR reviewed accessibility coverage. | Deliver reviewed six-language accessibl`
### error_empty_loading_retry_cancel
- `5: The page loads server tickets, uses explicit reply/status endpoints and exposes loading/error/empty states rather than generating support conversations locally.`
- `13: | **P1** | Replies are free text with no safety, privacy, template or delivery/reconciliation control | Any admin can send raw message; page has no approved response template, disclosure warning, attachment handling, outbound delivery statu`
- `14: | **P1** | Ticket review has no search, pagination, date/assignee/SLA filter or activity context | The page relies on a single list response and status filter only, limiting safe triage and investigation. | Provide server-filtered/paginated`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
