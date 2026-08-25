# Phase 0B semantic evidence — Nutrition

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/nutrition/nutrition.service.ts:2–281`
- `src/modules/nutrition/nutrition.controller.ts:2–85`
- `src/modules/nutrition/nutrition.module.ts:2–29`

The controller is JWT guarded and derives patient identity from `req.user.id` (`nutrition.controller.ts:7–18`). Routes cover nutrition profile read/update, meal log/history, daily summary, water log/history, exercise log/history and weekly report (`20–85`). The service validates profile goals/activity and numeric ranges, calculates BMI from entered height/weight, bounds logged timestamps to the last 31 days, and avoids inventing a target when profile setup is incomplete (`nutrition.service.ts:37–65,69–110`). Meal, water and exercise records are stored with patient_id and basic validation (`112–188`).

Daily summary queries meals, water, exercises and profile for a date and sums calories/macros/water/exercise (`191–238`). Weekly report invokes seven daily summaries sequentially, producing multiple database reads per day (`240–281`). Date filters use local `Date` construction and are not explicitly timezone/locale normalized (`29–35,134–142,155–163,181–188`). History queries have no visible pagination/projection and can return all matching documents. Create mutations have no visible idempotency/replay key, rate limit, audit event or deduplication. Create methods return full persisted documents (`114–131,146–153,167–179`), while profile read/update return full profile objects including restrictions/allergies and measurement fields (`69–110`).

The service permits client-supplied calories/macros/calories-burned without visible provenance or review; no clinical interpretation is performed in this surface, but downstream UI could treat calculated BMI/targets as advice. The module registers four schemas and repositories and exports the service (`nutrition.module.ts:16–28`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: duplicate logs on retries, full nutrition/health document returns, unbounded history, timezone ambiguity, N+1 weekly report, client-supplied nutrient truthfulness, and absent lifecycle/audit/clinical-safety governance.
