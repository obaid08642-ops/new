# Phase 2 Patient — family calendar workflow and authorization gap

## Scope

The Patient family calendar uses real Backend routes: `GET /family/calendar`, `POST /family/calendar/event`, and `DELETE /family/calendar/event/:eventId`. The group scoping is present. This audit identifies mobile compatibility, workflow, and authorization defects.

| Patient / Backend behavior | Finding | Required disposition |
|---|---|---|
| The only add-event UI uses `Alert.prompt` | `Alert.prompt` is iOS-only in React Native; Android users cannot enter an event title from this action | **P0 FIX — replace with a cross-platform modal/form and test on Android and iOS** |
| Add-event request includes title and type only | Backend defaults omitted `event_date` to `new Date()` and accepts optional time/member/description | A calendar event is silently created for the current instant; the user cannot select a future date/time, member, or description | **P0 FIX — require/select event date/time and expose supported fields before creating a shared calendar event** |
| `deleteCalendarEvent` checks only that caller belongs to the same group, then soft-deletes by group/event ID | Any group member can delete any group calendar event, regardless of creator or owner role | **P1 authorization FIX — enforce creator-or-owner deletion (or an explicit per-member capability), test same-group member denial** |
| Fetch failure clears events and shows normal empty state | A transient/failing data load is indistinguishable from an empty calendar | **FIX — render error/retry state separately from the authenticated empty state** |
| Family Hub shows member settings navigation for every non-owner card, even to a non-owner viewer | Backend permission mutation is owner-only | Non-owners are exposed to an action expected to fail | **FIX — derive control visibility from caller role and retain Backend authorization enforcement** |

## Positive controls

Backend calendar queries and soft-deletes are group-scoped, so unrelated groups cannot access each other through these routes. This does not satisfy the required within-group creator/owner authorization boundary for deletion.

## Decision

The family calendar must remain **authorization and workflow gated** until cross-platform event creation, intentional scheduling fields, scoped deletion authorization, and reliable error handling are implemented and tested. Related permission controls in the Family Hub require role-aware UI treatment in addition to Backend guards.
