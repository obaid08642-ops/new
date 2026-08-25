# Phase 0B semantic evidence — Medicine i18n spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/medicines/med-i18n.spec.ts:1–34`

The fixture defines Arabic and English base fields plus Urdu, Hindi, Bengali and an internal `tl` translation map (`3–16`). The spec asserts the public catalog locale contract is exactly `ar,en,ur,hi,bn,fil` (`18–21`), accepts a complete fixture through `missingPublicMedicineTranslations` (`23–25`), and detects deletion of the Filipino name through the internal `tl` map plus a missing Hindi dosage form, expecting public keys `fil.name` and `hi.dosage_form` (`27–33`).

The test provides useful six-locale completeness coverage and exposes a naming/mapping boundary between public `fil` and internal `tl` (`27–32`). It does not prove actual runtime translation loading, fallback behavior, locale negotiation, normalization, script/encoding safety, plural/unit/date/number formatting, clinical terminology quality, stale/mixed-language prevention, search indexing per locale, cache invalidation, or API/UI serialization. It does not validate that all required fields are semantically translated rather than non-empty or that `fil` cannot drift from `tl`. No code was changed and no build/test/application operation was performed during this read.
