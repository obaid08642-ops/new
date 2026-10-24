# Catalogue check: errors and missing translations (2026-10-24)

Scope: the seeded catalogue (seed-data files and the seeded test database `nabd_live`). Production was not read or written.
Result: **no seed-data defect was found, so no seed file changed.** The gaps are production medicine translations (needs
reviewed translations) and synthetic test-database medicines (no seed file to fix).

## Before and after counts per language

Counts are rows with a gap in that language. After = before, because nothing was changed.

### Seed data (`tools/catalog/translation-coverage.mjs`, all six locales)

| Catalogue | Rows | Gaps (ar, en, ur, hi, bn, fil) |
|---|---|---|
| labs | 65 | 0, 0, 0, 0, 0, 0 |
| radiology | 34 | 0, 0, 0, 0, 0, 0 |
| nursing | 33 | 0, 0, 0, 0, 0, 0 |
| specialties | 33 | 0, 0, 0, 0, 0, 0 |
| insurance | 30 | 0, 0, 0, 0, 0, 0 |
| packages | 12 | 0, 0, 0, 0, 0, 0 |

### Medicines

| Source | Rows | ur | hi | bn | fil |
|---|---|---|---|---|---|
| Production gap list `data/catalogue-input-01/untranslated.csv` (name / official name) | 100 bn, 80 hi, 60 ur (name); same for official name | 60 | 80 | 100 | not in the list |
| Seeded test database `nabd_live`, `missingPublicMedicineTranslations` (120 active rows) | 120 | 120 (name, main category, active ingredient, dosage form); strength 110 | 120 (same fields) | 120 (same fields) | 120 (same fields) |

The test-database rows are synthetic journey medicines (for example `Alonol-65c52f`) with no translations at all. Making them
complete would mean inventing translations for test names, so they are left as they are.

## Other checks on the seed data (all clean)

- Empty or English-only fields in ar/ur/hi/bn/fil: none (the coverage tool reports 0 English-left and 0 empty).
- Duplicate `name_en` within a catalogue: none.
- Image URLs: every `image_url` is an absolute or site-relative URL; none is empty.
- Category: labs (11 values), nursing (12 values) are consistent; radiology, specialties and insurance have no category field.
- Service rows without a language: none (the coverage tool counts every locale per row).

## Not fixed here, and why

1. **Production medicine translations (ur, hi, bn names and official names).** They need reviewed translations, and nothing in
   this repo has been approved for them. The owner approves them, and only then is a write made.
2. **Test-database medicines.** Synthetic data with no seed file; translating them would invent values.

## Proposed production step (for the owner's approval, not run)

A dry-run data check that reads the reviewed translations file (empty for now) and reports, per language, which gap rows it
would fill. It never writes unless `--apply` is given, and `--apply` refuses production database names. The owner reviews the
file, then approves the run.
