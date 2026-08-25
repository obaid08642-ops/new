# Phase 0B semantic evidence — Medicine structured-field localization

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/medicines/med-i18n.ts:1–181`

The module declares database/product language mappings for Arabic, English, Urdu, Hindi, Bengali and Tagalog/Filipino, but `PUBLIC_CATALOG_LOCALES` uses `fil` while `DbLang` and translation lookup use `tl`; callers must bridge these names correctly or Filipino localization can silently miss (`med-i18n.ts:10–19`). `missingPublicMedicineTranslations` requires Arabic/English names and conditional category/ingredient/form/strength fields for four non-Arabic database maps, but it does not require all localized fields, package-size/subcategory values, or actual translation quality; empty optional clinical fields are intentionally accepted (`21–47`).

Fallback translation uses finite Arabic regex dictionaries for dosage form and category, and word-level replacement for units/strength/package fields (`49–140`). This is heuristic substitution, not verified translation: partial matches can alter brand/clinical text, category ordering is first-match wins, and unit regexes may match substrings. The `RegExp` tables mix global and non-global expressions; `translateWith` calls `.test()` and then `.replace()`, while global regex `lastIndex` state can produce order-dependent behavior in repeated calls. Non-English languages other than source translation maps fall back to English labels, so Urdu/Hindi/Bengali/Filipino can receive English rather than their requested locale (`130–140,156–179`).

`localizeMedicineStructured` shallow-copies the raw medicine, then replaces only selected short fields from `translations[lang]` or heuristic English fallback. It does not validate language against `PUBLIC_CATALOG_LOCALES`, distinguish clinically safe vs cosmetic fields, preserve translation provenance/version, or prevent Arabic values from remaining when no dictionary match exists (`143–179`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: locale identifier drift, incomplete translation readiness gate, heuristic translation of clinical/catalog facts, regex statefulness, fallback language mismatch, absence of provenance/quality validation and silent untranslated values.
