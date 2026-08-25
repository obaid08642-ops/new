# Phase 0B semantic evidence — Hospital administration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/hospital/services/hospital.service.ts:2–200`
- `src/modules/hospital/controllers/hospital.controller.ts:2–85`
- `src/modules/hospital/hospital.module.ts:2–30`

`HospitalController` applies JWT guard and forwards the current user ID as hospital ID to branch, department, staff, doctor onboarding, appointments, wallet and invitation methods (`hospital.controller.ts:5–85`). It accepts raw bodies for branch/department/staff creation and invitation payloads. There is no visible controller-level role decorator; service `assertFacilityActor` permits hospital/facility roles and certain admin roles, but `actor` is optional and returns when absent (`hospital.service.ts:33–40`).

The service validates some ObjectIds and allowlists invitation permission keys, prevents non-invitee response, and links accepted providers by setting `parent_provider_account_id` and permissions (`54–110`). Branches/departments/staff use spread `...data`, allowing mass assignment of schema fields after only a few ID conversions (`113–147`). Onboarding can upsert an extended doctor profile and set doctor `verified`/`active` without visible license/review workflow (`149–159`).

Unified appointments loads all doctors affiliated with a hospital and returns up to 100 appointments; optional branch filter is applied directly without verifying branch belongs to that hospital (`162–170`). Status update permits a fixed string set but does not visibly enforce a state transition matrix or audit/event. Wallet loads all completed appointments for affiliated doctors and sums `total_price` in application memory, with no visible ledger reconciliation, currency/pagination/date window or financial source binding (`172–198`). Invitation lists return entire invitation documents plus invitee/facility names (`81–93`).

The module registers hospital schemas, doctor profile, user and appointment models, controller and service (`hospital.module.ts:14–30`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: optional actor fail-open, mass assignment, branch scope bypass, provider verification shortcut, invitation PII, appointment state drift and non-ledger wallet totals.
