# Patient Mobile: Nutrition profile, meal/water tracking and deferred plans — manual review

## Scope boundary

This read-only source review covers all 13 Nutrition inventory paths. It does not establish nutritional/clinical correctness, patient-specific dietary safety, allergy handling, ownership, calorie/macronutrient accuracy, food database provenance, target calculation, consent, retention or provider/dietitian review.

| Reviewed source | Scope |
|---|---|
| `app/nutrition/index.tsx` | Redirect to hub |
| `app/nutrition/hub.tsx` | Profile/daily-summary dashboard |
| `app/nutrition/body-target.tsx` | Nutrition profile and body/target fields |
| `app/nutrition/daily-tracker.tsx` | Daily meals, totals and water logging |
| `app/nutrition/log-meal.tsx` | Manual meal submission |
| `app/nutrition/water-tracker.tsx` | Redirect to daily tracker |
| `app/nutrition/food-scanner.tsx` | Redirect to manual meal logging |
| `app/nutrition/calorie-analyzer.tsx` | Redirect to manual meal logging |
| `app/nutrition/body-composition.tsx` | Redirect to body-target profile |
| `app/nutrition/ai-meal-planner.tsx` | Redirect/deferred weekly planning |
| `app/nutrition/ai-plan-builder.tsx` | Redirect/deferred AI plan |
| `app/nutrition/nutrition-plan.tsx` | Redirect/deferred weekly plan |
| `app/nutrition/exercise-plan.tsx` | Redirect/deferred exercise plan |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-NUT-001 | `STATIC_MATCHED_PARTIAL` | `nutrition/body-target.tsx:11–23` | Profile reads/posts height, weight, goals, calorie/water targets, restrictions and allergies. Validation only requires finite numbers and comma-delimited free text; it does not enforce plausible units/ranges, age/pregnancy/condition constraints, allergy taxonomy, source of targets, consent or clinical suitability. | Nutrition DTO/schema/owner enforcement; medically governed target/range/allergy policy; unit/locale validation, history/edit/delete and dietitian-review evidence. |
| PM-NUT-002 | `STATIC_MATCHED_PARTIAL` | `nutrition/daily-tracker.tsx:13–32, 36–50`; `nutrition/log-meal.tsx:23–45` | Daily tracking reads summary/meals and posts arbitrary named meals and water quantities. Client computes percentages and local date, while manual foods/calories/macros have no verified food database, serving unit, duplicate/idempotency or nutrition-safety reconciliation. | Authoritative daily-period/timezone and aggregation contract; nutrition data provenance/serving units; owner/idempotency/error tests; dietary restriction/allergy safeguards. |
| PM-NUT-003 | `INSUFFICIENT_EVIDENCE` | `nutrition/hub.tsx:12–34` | Hub combines profile and daily summary, falls back between server target fields, and renders percent/target copy. Static source cannot establish data completeness, freshness, owner access, clinical interpretation or that displayed goals are safe for the patient. | Profile/summary authorization and freshness contract; target-source precedence; clinical policy and runtime validation. |
| PM-NUT-004 | `MISSING_CAPABILITY` | `nutrition/ai-meal-planner.tsx:3–9`; `nutrition/ai-plan-builder.tsx:1–6`; `nutrition/nutrition-plan.tsx:3–9`; `nutrition/exercise-plan.tsx:1–6` | Weekly/AI meal plans and exercise planning explicitly are not persisted/validated and redirect to hub or daily tracking. They are not features that can be treated as implemented. | Product and data model decision; clinically reviewed plan generation/approval/persistence and truthful discovery only if approved. |
| PM-NUT-005 | `MISSING_CAPABILITY` | `nutrition/food-scanner.tsx:1–6`; `nutrition/calorie-analyzer.tsx:1–6`; `nutrition/body-composition.tsx:1–6`; `nutrition/water-tracker.tsx:1–6`; `nutrition/index.tsx:1–7` | Scanner/calorie analysis/body composition are unavailable aliases; water and entry routes redirect to canonical tracker/hub. No camera analysis, verified estimate, advanced composition metric or independent water workflow exists. | Explicit supported-scope UX; verified food recognition/body-composition contracts only if implemented; route/guard and runtime evidence. |

## Conclusion

Nutrition implements manual tracking but not personalized clinical nutrition care. Targets, summaries and entries require backend/clinical validation; major planning/scanning/composition features are deliberately redirected rather than fabricated. Manual source review is complete only for the 13 inventory paths.
