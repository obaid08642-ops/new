# Phase 2 Patient — AI nutrition-plan contract gap

## Scope

The Patient AI diet-plan builder calls real routes: `POST /ai/generate-diet-plan` and `POST /nutrition/profile`. The routes exist. This review compares the client rendering/persistence assumptions with the Backend generator and profile service.

| Patient behavior | Backend behavior | Finding | Required disposition |
|---|---|---|---|
| Treats the response as `{ calories, protein, carbs, fat, meals: [...] }` and calls `plan.meals.map(...)` | `generateDietPlan` prompts for and returns `{ "plan": [{ "day": 1, "meals": [...] }] }`; on any generator/parse error it returns `{ plan: [] }` | The response shape is incompatible. A successful backend response or fallback can reach the generated-plan screen with `plan.meals` undefined and cause a runtime error | **P0 FIX — define and enforce one response schema on both sides; render an explicit empty/error state, never a success page for an empty plan** |
| Labels the result as a ready plan and exposes “Save plan” | Generator does not persist a diet plan; the screen only persists selected profile metrics then navigates to a separate route | Save is not a real save operation and generated content is lost across navigation/reload | **FIX — persist a reviewed plan object with patient ownership, or rename/remove the save action until persistence exists** |
| Swallows `/nutrition/profile` persistence failure after AI response | Profile update is a separate real persistence operation | User can see a generated plan while assuming profile goals/metrics were saved | **FIX — surface persistence failure and make the intended save state explicit** |
| Sends diet and allergies to AI, but profile persistence sends neither `dietary_restrictions` nor `allergies` | Nutrition profile supports `dietary_restrictions` and `allergies` fields | Preferences may influence one transient AI request but are not retained in the medical/nutrition profile | **FIX — map and validate preferences explicitly, with patient consent and privacy treatment** |
| Validates only nonzero numeric fields | Generator receives free-form body; client applies no medically safe ranges, target relationship checks, contraindication screening, or disclaimer | Arbitrary or unsafe body data can be used to generate a health-facing plan | **MEDICAL-SAFETY FIX — validate ranges/goal consistency, display non-diagnostic limitations, and route contraindications to a clinician/nutritionist flow** |
| Backend converts generation failures to empty `{ plan: [] }` | Client interprets any response as success | A gateway failure is indistinguishable from a valid but empty plan | **FIX — return a typed failure or client-detect empty result before transitioning UI** |

## Positive controls

The client does require actual user-entered body metrics rather than inserting a fabricated default. Nutrition profile persistence is guarded in Backend and its update fields are patient-scoped. These controls do not resolve the response-schema and medical-safety gaps above.

## Decision

AI nutrition plan generation must be **blocked from production health-plan presentation** until response schema, persistence semantics, error handling, preferences, range validation, and medical-safety language are implemented and tested. This is a real-feature remediation need, not a missing route.
