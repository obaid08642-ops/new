# Nabdah Provider — Source Localization Inventory

**Date:** 2026-08-19  
**Scope:** Static source inspection of the isolated Provider Expo 57 application.  
**Result:** **Inventory complete; full six-language migration remains open.**

## Method

The scan evaluated TypeScript and TSX files under `src/` for Arabic/English presentation branches (`AR`, `isRTL`, and language comparisons). It then extracted simple string branches of the form `AR ? Arabic : English` and separated Arabic-script human text from direction/layout values such as `row-reverse` and `right`.

## Measured Scope

| Measure | Result |
|---|---:|
| Source files scanned | 73 |
| Files containing AR/EN presentation branches | 49 |
| AR/EN presentation-branch hits | 5,299 |
| Simple Arabic/English human-text occurrences | 3,755 |
| Unique Arabic/English human-text pairs | 2,810 |
| Already added shared typed keys | 99 |

The largest current source concentrations are the doctor dashboard (708 simple text branches), shared screens (478), facility dashboard (374), nursing dashboard (329), pharmacy dashboard (298), laboratory dashboard (279), and laboratory/radiology registration screens (259 each).

## Interpretation

The 99-key shared dictionary and six-language `LangProvider` foundation are necessary but do **not** translate provider screens that still choose Arabic or English directly. When the current user selects Urdu, Hindi, Bengali, or Filipino, those direct branches generally fall through to English; they are therefore not release-ready as six-locale UI.

The scan is deliberately static. It does not replace fluent linguistic review, clinical terminology approval, device font/rendering inspection, RTL/LTR visual QA, accessibility validation, or dynamic text/error/push-notification verification.

## Required Remediation Sequence

1. Preserve Arabic-only RTL behavior while replacing direct display-text branches with the typed locale resolver.
2. Generate and validate translations in controlled batches, retaining source Arabic/English pairs, keys, and reviewer context.
3. Add per-screen locale-key coverage and fallback tests; no screen should silently use an English-only branch for a supported locale.
4. Run TypeScript, contract tests, Expo export, and six-locale human visual/accessibility review after every batch.
5. Do not declare six-language release readiness until each of the 49 affected files has migrated or has documented server-provided localized content.

## Explicit Non-Closure

This inventory is evidence of the remaining scope, not evidence that the translations are complete. It does not change the existing requirements for real-device review, deployment approval, sandbox E2E, payment activation, or the fail-closed emergency/QR/consent/location contracts.
