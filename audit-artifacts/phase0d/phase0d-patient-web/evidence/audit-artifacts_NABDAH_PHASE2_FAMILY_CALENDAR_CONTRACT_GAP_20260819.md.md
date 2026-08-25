# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_FAMILY_CALENDAR_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `cfc0c298e18beebacab46115f97f02ea04104742af9e26b6f93e1cae3779396b`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient family calendar uses real Backend routes: `GET /family/calendar`, `POST /family/calendar/event`, and `DELETE /family/calendar/event/:eventId`. The group scoping is present. This audit identifies mobile compatibility, workflow, a`
- `12: | Fetch failure clears events and shows normal empty state | A transient/failing data load is indistinguishable from an empty calendar | **FIX — render error/retry state separately from the authenticated empty state** |`
- `17: Backend calendar queries and soft-deletes are group-scoped, so unrelated groups cannot access each other through these routes. This does not satisfy the required within-group creator/owner authorization boundary for deletion.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 2 Patient — family calendar workflow and authorization gap`
- `5: The Patient family calendar uses real Backend routes: `GET /family/calendar`, `POST /family/calendar/event`, and `DELETE /family/calendar/event/:eventId`. The group scoping is present. This audit identifies mobile compatibility, workflow, a`
- `11: | `deleteCalendarEvent` checks only that caller belongs to the same group, then soft-deletes by group/event ID | Any group member can delete any group calendar event, regardless of creator or owner role | **P1 authorization FIX — enforce cr`
- `13: | Family Hub shows member settings navigation for every non-owner card, even to a non-owner viewer | Backend permission mutation is owner-only | Non-owners are exposed to an action expected to fail | **FIX — derive control visibility from c`
- `17: Backend calendar queries and soft-deletes are group-scoped, so unrelated groups cannot access each other through these routes. This does not satisfy the required within-group creator/owner authorization boundary for deletion.`
- `21: The family calendar must remain **authorization and workflow gated** until cross-platform event creation, intentional scheduling fields, scoped deletion authorization, and reliable error handling are implemented and tested. Related permissi`
### state_transitions
- `12: | Fetch failure clears events and shows normal empty state | A transient/failing data load is indistinguishable from an empty calendar | **FIX — render error/retry state separately from the authenticated empty state** |`
- `21: The family calendar must remain **authorization and workflow gated** until cross-platform event creation, intentional scheduling fields, scoped deletion authorization, and reliable error handling are implemented and tested. Related permissi`
### payment_insurance_relevance
- `13: | Family Hub shows member settings navigation for every non-owner card, even to a non-owner viewer | Backend permission mutation is owner-only | Non-owners are exposed to an action expected to fail | **FIX — derive control visibility from c`
### error_empty_loading_retry_cancel
- `12: | Fetch failure clears events and shows normal empty state | A transient/failing data load is indistinguishable from an empty calendar | **FIX — render error/retry state separately from the authenticated empty state** |`
- `21: The family calendar must remain **authorization and workflow gated** until cross-platform event creation, intentional scheduling fields, scoped deletion authorization, and reliable error handling are implemented and tested. Related permissi`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
