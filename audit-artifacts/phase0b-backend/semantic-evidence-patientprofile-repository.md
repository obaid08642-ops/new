# Phase 0B semantic evidence — Patient profile repository wrapper

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/auth/repositories/patientprofile.repository.ts:1–13`

`PatientProfileRepository` is an injectable subclass of `MongoRepository<PatientProfileDocument>`, binding the injected model through `@InjectModel(PatientProfile.name)` and delegating immediately to the superclass (`patientprofile.repository.ts:1–13`). It defines no custom profile query, ownership/member authorization, tenant scope, field projection, PII redaction, soft-delete, versioning, transaction or audit behavior. All safety properties are delegated to the generic repository, schema and callers. The import comment/spacing is non-functional provenance drift. No product code was changed and no tests/builds were executed during this semantic read.
