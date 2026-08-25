# Phase 0B semantic evidence — HospitalService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/hospital/services/hospital.service.spec.ts:1–51`

The Jest unit spec builds `HospitalService` with mocked branch, department, staff, invitation, doctor, user and appointment models (`4–17`). It contains four tests: UUID hospital ID resolution to a stored Mongo ID for staff reads (`19–24`); acceptance of a provider actor normalized from `provider_type:'hospital'` (`26–31`); rejection of a patient actor and doctor provider before staff querying (`33–38`); and constraining appointment status update to doctors affiliated with the hospital (`40–50`).

This provides focused source regression evidence for the historical UUID/ObjectId boundary and hospital-role normalization. It does not exercise controller decorators/guards, unauthenticated access, facility ownership resolution failure, branch/department scope, invitation acceptance, staff mutations, role capability matrix, status-transition legality, appointment state ownership beyond doctor ID inclusion, audit events, transactions, concurrency, idempotency, notification or live HTTP status codes. All models are mocks and several model methods/returns are not exercised (`5–16`).

The appointment update assertion checks a query containing `doctor_id: {$in:[...]}` but does not verify hospital/branch identity in each doctor record, allowed target statuses, actor scope, before/after history, or mutation failure handling (`40–50`). The positive UUID resolver test also assumes `findOne` returns the expected `_id` and does not cover missing/ambiguous/fake hospital identities (`19–24`). No test was run and no product code was changed during this semantic read.
