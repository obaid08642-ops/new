# Phase 2 Patient main — synthetic-data marker review

A static scan of Patient `main` production source found 153 marker lines across 77 files. This is a triage result, not a defect count: most `placeholder=` strings are legitimate input hints, and comments such as “previous version rendered a hardcoded plan” document a past fix rather than active fake data.

## Review rules

A marker is not classified as a production defect solely because it contains the word `placeholder`, `sample`, or `example`. The reviewer must determine whether it is an input hint, a real empty-state label, a test-only value, a documented historical fix, or an active business value rendered without a backend source.

## Priority findings

| Area | Example | Current classification |
|---|---|---|
| Nutrition exercise plan | Comment states the previous version rendered a hardcoded gym plan for everyone | Verify current API/error/empty behavior; do not treat the comment as active fake data |
| Nutrition body composition | “Body silhouette placeholder” | UI placeholder; verify whether it is structural visual UI or an unbacked health result |
| Reviews | Comment states a former fake success was replaced by a real endpoint | Positive evidence of prior remediation; runtime mutation test remains required |
| Wearables | Comment states latest sample is real data only | Verify source and empty state; no synthetic-data defect inferred from comment |
| Maternity, nutrition, profile, health forms | `placeholder=` examples for user input | Legitimate input hints unless they are used as default persisted values |
| Medical modules | Any numeric/string defaults outside form placeholders | Requires manual review against API response and medical-safety rules before PASS |

The scan therefore produces a **REVIEW queue**, not automatic deletion instructions. No source was modified based solely on these markers. The findings must feed Phase 8 remediation only where a real user-visible synthetic value or local-only success is proven.
