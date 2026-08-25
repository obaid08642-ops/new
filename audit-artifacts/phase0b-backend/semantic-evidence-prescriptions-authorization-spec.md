# Phase 0B semantic evidence — Prescription authorization spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/prescriptions/prescriptions.authorization.spec.ts:1–300`

This Jest unit spec constructs `PrescriptionsService` with mocked repository, medicines catalog, appointments, providers and events (`17–53`). It covers authorized patient/doctor/pharmacy/admin detail projection while excluding diagnosis/notes and exposing normalized doctor/item fields (`55–71`), foreign patient/provider detail denial (`73–85`), creation requirements for appointment and patient, stale/foreign appointment denial, provider/profile identity matching, rejection of unverified catalog medicines, prescription-scoped manual entries with pending review, missing manual-name rejection, dispensing block pending review, approved substitute handling, non-doctor rejection, foreign mutation denial, owning doctor send-to-pharmacy and approved-catalog creation with appointment linkage/event (`87–299`).

The suite is strong source-level regression evidence for the audited prescription BOLA and manual-entry truthfulness boundaries. It remains mock-only: it does not exercise controller/guard/session extraction, HTTP status/404 uniformity, database transactions, unique prescription/appointment linkage, idempotency/replay, concurrent transition/substitute/dispense, webhook/payment/ledger effects, pharmacist assignment validity, clinical dose/unit safety, medication interaction/allergy checks, audit persistence, or live deployment (`17–53,227–299`).

Several assertions rely on permissive `any` objects and mocked `save`, `updateOne`, `create` and `getById` methods (`23–52,187–214`). The spec confirms event calls and returned objects, but not durable event delivery, exactly-once state changes, rollback on partial failure, or whether the downstream pharmacy and patient projections are minimized exhaustively. Manual medicine tests prove pending review flags but do not prove reviewer authorization, substitute equivalence, inventory availability or dispense audit (`151–214`). No test was run and no product code was changed during this semantic read.
