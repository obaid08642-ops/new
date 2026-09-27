# Live journey findings: work for the implementer agent

The reviewer finds these problems by driving the real backend with the live journeys
(`tools/live/j_*.py`). The reviewer fixes small issues directly. Anything larger is
listed here for the implementer agent, working on `fix/audit-2026-09`.

Rules for each item:
- Fix it where it is described. Do not widen the change.
- Add a unit test for the rule.
- Make the named live journey step pass (see `tools/live/README` or `start-backend.sh`).
- Commit with the item id in the message, e.g. `LJ-01`.

Status: `open` means the agent does it; `done` means the reviewer verified it live.

---

## PHASE LJ — Live-journey gaps

### LJ-01: Staff attendance has no caller (hospital)
- **Status:** open
- **Where:**
  - Backend: `backend/src/modules/facility-ops/facility-ops.module.ts`
    - `POST /facility/shifts/attendance/check-in`
    - `POST /facility/shifts/attendance/check-out/:id`
  - App: provider-app `FacilityDashboard.tsx`, the attendance screen (`GET /facility/shifts/attendance`).
- **Problem:**
  - The screen says attendance is "auto-registered when staff log in within facility GPS range", but no app calls check-in or check-out, so the list is always empty.
  - The controller only allows the HOSPITAL role, so a staff doctor could not check in anyway.
  - The facility id comes from `u.parent_provider_account_id || u.id`, but a staff member's token carries neither the facility id nor a link to it.
- **Required:**
  1. A provider linked to a facility (`provider_accounts.facility_id`, set on invitation accept or for hospital-created sub-accounts) can check in and out for its own facility from the provider app. Use GPS, and check the location against the facility coordinates (`provider_profiles` geo) within a configurable radius.
  2. The facility id is resolved on the server from `provider_accounts.facility_id`, never taken from the client.
  3. Allow one open attendance per person, and check-out only by its owner or the facility.
  4. The facility attendance screen lists real rows. Remove the "auto-registered" text unless it becomes true.
- **Live check:** in `tools/live/j_facility.py`, the linked doctor checks in, the facility sees them present, the doctor checks out, and a second check-in while one is open is refused.
