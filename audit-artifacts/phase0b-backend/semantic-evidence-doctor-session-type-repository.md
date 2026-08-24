# Phase 0B semantic evidence — doctorsessiontype.repository.ts

**Archive member:** `src/modules/provider/services/repositories/doctorsessiontype.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and DoctorSessionType. Lines 8–13 define an injectable repository extending `MongoRepository<DoctorSessionType>` and pass the named model to the superclass.

**Behavioral scope:** No custom query or policy is present for provider ownership, published/active status, session duration, price/currency, insurance eligibility, effective dates, uniqueness, versioning, transaction, or projection. All rules are delegated to schema/service/database layers.

**Integrity implications:** As a repository used by scheduling and booking flows, generic CRUD does not ensure that only approved provider session types are exposed, that prices are server-authoritative, or that concurrent updates cannot alter a session type used by an existing booking.

**Test implications:** verify model token resolution, provider ownership, active/published filtering, duration/price/currency invariants, insurance eligibility, effective-date/version behavior, uniqueness and public projection. No tests executed during this semantic read.
