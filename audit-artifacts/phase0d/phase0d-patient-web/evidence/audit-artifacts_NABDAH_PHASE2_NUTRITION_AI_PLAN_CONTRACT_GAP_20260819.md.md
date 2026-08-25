# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_NUTRITION_AI_PLAN_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `672bec28ecdc27b169ae2b1d3f72e9b4e4adda925bb62195d19bfa5e399be087`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient AI diet-plan builder calls real routes: `POST /ai/generate-diet-plan` and `POST /nutrition/profile`. The routes exist. This review compares the client rendering/persistence assumptions with the Backend generator and profile serv`
- `9: | Treats the response as `{ calories, protein, carbs, fat, meals: [...] }` and calls `plan.meals.map(...)` | `generateDietPlan` prompts for and returns `{ "plan": [{ "day": 1, "meals": [...] }] }`; on any generator/parse error it returns `{`
- `10: | Labels the result as a ready plan and exposes “Save plan” | Generator does not persist a diet plan; the screen only persists selected profile metrics then navigates to a separate route | Save is not a real save operation and generated con`
- `13: | Validates only nonzero numeric fields | Generator receives free-form body; client applies no medically safe ranges, target relationship checks, contraindication screening, or disclaimer | Arbitrary or unsafe body data can be used to gener`
- `22: AI nutrition plan generation must be **blocked from production health-plan presentation** until response schema, persistence semantics, error handling, preferences, range validation, and medical-safety language are implemented and tested. T`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: | Labels the result as a ready plan and exposes “Save plan” | Generator does not persist a diet plan; the screen only persists selected profile metrics then navigates to a separate route | Save is not a real save operation and generated con`
### state_transitions
- `9: | Treats the response as `{ calories, protein, carbs, fat, meals: [...] }` and calls `plan.meals.map(...)` | `generateDietPlan` prompts for and returns `{ "plan": [{ "day": 1, "meals": [...] }] }`; on any generator/parse error it returns `{`
- `11: | Swallows `/nutrition/profile` persistence failure after AI response | Profile update is a separate real persistence operation | User can see a generated plan while assuming profile goals/metrics were saved | **FIX — surface persistence fa`
- `14: | Backend converts generation failures to empty `{ plan: [] }` | Client interprets any response as success | A gateway failure is indistinguishable from a valid but empty plan | **FIX — return a typed failure or client-detect empty result b`
- `22: AI nutrition plan generation must be **blocked from production health-plan presentation** until response schema, persistence semantics, error handling, preferences, range validation, and medical-safety language are implemented and tested. T`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: | Treats the response as `{ calories, protein, carbs, fat, meals: [...] }` and calls `plan.meals.map(...)` | `generateDietPlan` prompts for and returns `{ "plan": [{ "day": 1, "meals": [...] }] }`; on any generator/parse error it returns `{`
- `14: | Backend converts generation failures to empty `{ plan: [] }` | Client interprets any response as success | A gateway failure is indistinguishable from a valid but empty plan | **FIX — return a typed failure or client-detect empty result b`
- `22: AI nutrition plan generation must be **blocked from production health-plan presentation** until response schema, persistence semantics, error handling, preferences, range validation, and medical-safety language are implemented and tested. T`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
