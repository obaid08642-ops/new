# Phase 2 Patient — placeholder triage

## Findings

A second scan of Patient source markers was manually triaged to avoid counting legitimate input placeholders, loading skeletons, historical-remediation comments, or honest empty states as fabricated production data.

| Location | Finding | Classification | Action |
|---|---|---|---|
| `health/reminders.tsx:89` | `handlePlayAlarmTest` displays the Arabic title `منبه الدواء التجريبي` and a warning haptic when the user explicitly tests the alarm | **TEST-ONLY UI / REVIEW** | Keep only if clearly labelled as a local alarm preview; it must not imply a real medication dose, persisted reminder, or taken status |
| `(tabs)/index.tsx` fallback branch | Unmapped home shortcut shows `Coming Soon` / `الخدمة ستتوفر قريباً` instead of silently succeeding | **HONEST UNAVAILABLE STATE** | Not fabricated data; inventory the shortcut and either wire it to a real route or keep the explicit disabled state with accessibility feedback |
| `diagnostics/booking-confirm.tsx:45-74` | Fixed home fee/VAT, generated tomorrow date, fallback provider ID, and `example.com` document URL | **CONFIRMED FIX/BLOCKED** | Already recorded in `NABDAH_PHASE2_MEDICAL_DATA_RISK_REVIEW_20260819.md`; no booking may use these values |
| `maternity/fetus-data.ts` | Week-by-week educational fetal reference content and images | **STATIC EDUCATIONAL CONTENT** | Not a patient-specific fabricated record; preserve only with product/medical-content review |
| `nursing/live-tracking.tsx` and other comments | Markers describing earlier fake implementations that were removed | **HISTORICAL REMEDIATION COMMENT** | Do not classify as current synthetic runtime data without an active code path |

## Decision

The scan adds no new confirmed synthetic clinical record beyond the diagnostics and maternity findings already documented. The medication alarm preview requires a UX clarity check, while the home fallback requires a navigation inventory but is an honest unavailable state rather than a fake success. This report is evidence only and does not modify source code or activate blocked features.
