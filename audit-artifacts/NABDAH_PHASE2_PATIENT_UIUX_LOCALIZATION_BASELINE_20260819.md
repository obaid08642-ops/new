# Phase 2 Patient — UI/UX and localization baseline

## Scope and verified evidence

Patient has a central light/dark token palette and six locale files (`ar`, `en`, `ur`, `hi`, `bn`, `tl`). It also relies on `autoTranslate`, which translates only exact Arabic phrase matches rendered through compatible components. A static module inventory found significant raw visible-text candidates across the reviewed feature groups; these counts are a **manual-review queue**, not a claim that every candidate is untranslated.

| Feature group | Files with localization mechanism | Raw visible-text candidates requiring coverage review |
|---|---:|---:|
| Health | 25 | 119 |
| Nutrition | 9 | 60 |
| Maternity | 6 | 85 |
| Mental health | 6 | 34 |
| Family | 11 | 25 |
| Insurance | 12 | 105 |
| Pharmacy | 21 | 163 |
| Consultations | 26 | 113 |
| Diagnostics | 19 | 152 |
| Settings | 7 | 37 |
| Profile | 3 | 2 |

## Confirmed defects

| Area | Evidence | Required disposition |
|---|---|---|
| Global bottom navigation | `BottomNavBar.tsx` sets `const isRTL = lang === 'ar' || lang === 'ur' || true` | **P0 UX/localization FIX — the unconditional `|| true` reverses navigation for every language, including English, Hindi, Bengali, and Filipino** |
| Translation fallback | `autoTranslate` returns the original text when no exact dictionary phrase match is found | **FIX — create key-based coverage for all critical strings, dynamic/interpolated strings, accessibility labels, errors, and financial/medical copy; never rely on raw-text fallback as translation completion** |
| Design-token adoption | Feature screens inspected in checkout, payment processing, consultation confirmation, and family flows contain many literal colors/surfaces alongside tokens | **FIX — design-system audit and token migration in Phase 8; no global visual rewrite before functional contract fixes** |
| Navigation accessibility | Bottom navigation touch controls do not provide explicit accessibility role/label/state metadata | **FIX — add semantic accessibility labels/states and test screen-reader order in RTL/LTR** |
| Design consistency | Bottom bar and payment processing use independent hard-coded visual treatments rather than one governed surface/elevation/state pattern | **FIX — consolidate visual tokens after UX benchmarking and functional remediation** |

## Decision

The Patient UI/UX and localization work is **open**. The next audit passes must separate intentional Arabic source copy from untranslated output through device/runtime coverage in all six languages, then record component-level visual defects before Phase 8 remediation. No visual change is approved merely because it appears more decorative; it must preserve accessibility, medical clarity, and functional state truthfulness.
