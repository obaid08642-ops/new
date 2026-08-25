# Phase 0B semantic evidence — Family and delegated access

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/family/family.service.ts:2–445`
- `src/modules/family/family.controller.ts:2–134`
- `src/modules/family/family.module.ts:2–27`

`FamilyController` applies JWT and `NoGuestsGuard` to all routes and exposes group create/read/invite/join/leave, member relation/permission/remove, member records/health, emergency contacts, shared calendar, and permission request/respond routes (`family.controller.ts:7–134`). It uses manual request-user ID extraction but accepts raw bodies, including group name, invite code, display/relation, event object, scopes/permissions and consent-like decisions. There are duplicate contract/legacy routes for members and removal (`47–85`).

`FamilyService` uses a six-character `Math.random` invite code with 24-hour expiry, stores it on the group and sends it via optional notification service; it fails closed if delivery is unavailable (`family.service.ts:39–105`). Joining reads invite code, expiry and membership then pushes a member without an atomic membership/expiry predicate (`119–147`). Group and member operations are owner/member scoped, but `getMemberHealth` checks requester permission and reads the target's full MedicalProfile without first confirming the target is a group member (`167–177`). `getMemberRecords` confirms target membership and returns permission-filtered, bounded bundles from vitals, reminders, prescriptions, labs, radiology, appointments and emergency card, but always adds profile basics and catches underlying query failures as empty/null data (`184–245`).

Permission update filters keys but does not visibly version or audit changes; leave/remove/calendar mutations use read-then-update patterns. Emergency contacts return other members' phone/full name, and shared calendar events return full event records with broad description/ref data and are unbounded (`293–376`). Permission requests accept any target member ID without validating target membership, create duplicates without idempotency, and response updates status without a pending-state predicate; granting then updates membership separately (`381–435`). Event emission failures are silently swallowed (`440–444`). The module registers three schemas/repositories and exports the service (`family.module.ts:2–27`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: weak invite entropy/race, target membership bypass in health, delegated-health PII breadth, silent partial failures, unbounded calendar/permission data, duplicate contract routes, permission replay/races and silent event loss.
