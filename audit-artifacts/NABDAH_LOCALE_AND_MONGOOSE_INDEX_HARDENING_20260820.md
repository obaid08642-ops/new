# Nabdah Plus — Locale and Mongoose-Index Hardening

**Date:** 2026-08-20  
**Scope:** Phase 5 of the hardening program  
**Deployment status:** **Not deployed**. No production index operation or data migration was run.

## Locale decision

The supported product set is exactly six locales: **Arabic (`ar`)**, **English (`en`)**, **Urdu (`ur`)**, **Hindi (`hi`)**, **Bengali (`bn`)**, and **Filipino (`fil`)**. There is no seventh locale. The data contract stores Filipino/Tagalog under the internal key `translations.tl`; the Patient client already maps `fil` to `tl`.

A `translations` map is now declared in the Medicine schema. `missingPublicMedicineTranslations` validates display-critical fields before the administrative medicine-approval path can set `public_eligibility: true`. It requires Arabic and English names and verifies Urdu, Hindi, Bengali, and Filipino names plus translated category, active ingredient, dosage form, and strength whenever those source fields are populated. A failure returns `public_translation_incomplete:<gaps>` rather than publishing English/Arabic fallback silently.

| Product locale | Source location | Required before public medicine approval |
|---|---|---|
| `ar` | Arabic source columns | `name_ar` |
| `en` | English source columns | `name_en` |
| `ur` | `translations.ur` | `name` and populated display-critical fields |
| `hi` | `translations.hi` | `name` and populated display-critical fields |
| `bn` | `translations.bn` | `name` and populated display-critical fields |
| `fil` | `translations.tl` | `name` and populated display-critical fields |

## Mongoose-index decision

`LabResult.booking_id` had both a property-level `@Prop({ index: true })` index and an equivalent `LabResultSchema.index({ booking_id: 1 })` declaration. The redundant schema-level declaration was removed; the property-level index remains. This is source de-duplication, not a production index drop.

The claimed duplicate compound index in `mental-health.schema.ts` was independently rechecked. The source ends at line 98 and has one `{ patient_id: 1, logged_at: -1 }` compound index for each of MoodEntry, MeditationSession, and BreathingSession. No duplicate declaration exists in the current source, so no index was removed.

| Candidate | Result | Production action |
|---|---|---|
| `LabResult.booking_id` duplicate declaration | Removed schema duplicate; property index retained | None until index inventory confirms a duplicate physical index |
| Mental-health `{ patient_id, logged_at }` | False positive in current source; no removal | None |

## Rollback and release handling

Rollback for this source change is a source rollback restoring the removed LabResult schema declaration. It does **not** create, drop, or rebuild indexes. Any physical index change requires a separate approved runbook: capture `getIndexes()` inventory and index names, compare key/options, apply a single named operation in a maintenance window, validate query plan and error metrics, and retain a recreate command with the original key/options. No automatic `syncIndexes`, `dropIndex`, or production Mongo command is introduced.

## Verification

| Gate | Result |
|---|---|
| Locale contract regression | 3 tests passed |
| Mongoose-index contract regression | 2 tests passed |
| Backend TypeScript build | Passed |
| Production migration/index command | Not attempted |
| Production deployment | Not attempted |

The next phase is the final multi-application gate and updated readiness judgment.
