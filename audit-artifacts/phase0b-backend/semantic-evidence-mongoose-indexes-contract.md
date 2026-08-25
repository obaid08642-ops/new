# Phase 0B semantic evidence — Mongoose indexes contract

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/mongoose-indexes.contract.spec.ts:1–21`

The contract imports `LabResultSchema` and three mental-health schemas. Its helper serializes index key documents and detects duplicate key declarations (`4–7`). One test asserts exactly one `{ booking_id: 1 }` index in `LabResultSchema` (`9–13`). A second asserts no duplicate key declarations in `MoodEntrySchema`, `MeditationSessionSchema` and `BreathingSessionSchema`, and requires `{ patient_id: 1, logged_at: -1 }` on MoodEntry (`15–20`).

This is a narrow schema-definition governance check. It does not verify index options (unique, partial, sparse, TTL, collation), actual database index creation, migration drift, hidden/duplicate indexes with different options, query-plan effectiveness, tenant/ownership coverage, overlapping interval constraints, or any schema outside the four imported models. The duplicate helper compares only serialized key documents and ignores index options. No code was changed and no build/test/application operation was performed during this read.
