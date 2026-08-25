# Phase 0B semantic evidence — Nutrition schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:** `src/schemas/nutrition.schema.ts:1–79`

The file defines timestamped NutritionProfile, MealLog, WaterLog and ExerciseLog collections (`4–79`). NutritionProfile requires indexed patient_id and optionally stores enum goal/activity_level, height/weight/target/BMI/body-fat, calorie/water targets, dietary restrictions and allergies (`5–29`). MealLog requires patient_id/name, defaults nutritional numeric fields to zero, enum meal_type, image_url empty string and logged_at (`31–54`). WaterLog requires patient_id/amount_ml and logged_at (`56–65`). ExerciseLog requires patient_id/name, defaults duration/calories to zero, stores free-form exercise_type and logged_at (`67–79`).

Profile measurements and targets have no positive/range/unit/precision validation and BMI/calorie/water targets have no formula/source/provenance or consistency with height, weight, age, sex, pregnancy, disease or activity (`7–25`). Dietary restrictions/allergies are free-form arrays with no controlled identifiers, severity/reaction/source/verification or clinical safety relation to meal/exercise recommendations (`24–25`). `patient_id` is only a string/index and no consent, caregiver delegation, tenant or active-patient invariant is declared (`7`).

Meal calories/macros and water amount have no non-negative/range/unit/precision validation, serving quantity/source or consistency checks (`34–40,59–61`). Zero defaults can represent unknown versus explicit zero despite the profile comment only addressing unset profile values (`12–19,36–40`). Meal image_url is a raw string with no upload/storage/access/content/retention controls (`49–50`). Exercise duration/calories/type have no range, unit, intensity/source or consistency validation (`70–75`).

All logs default to application current time without timezone, event source, correction provenance or chronological constraints (`50,61,75`). No idempotency/duplicate prevention, immutable append-only history, correction/audit actor, CAS/version, bounded retention/aggregation or concurrent update protection is represented. There is no deletion/legal hold/DSAR lifecycle or notification/adherence/reminder state.

Nutrition data can be health/biometric/allergy information; no field-level projection, encryption, consent, retention or access audit appears (`7–25,34–75`). No clinician/dietitian review, contraindication, emergency/abnormal metric alert or recommendation safety state exists. No live index/runtime, profile/log write or data-quality evidence is established during this source read. No code was changed and no build/test/application operation was performed during this read.
