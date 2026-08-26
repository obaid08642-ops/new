# Patient Web: Nutrition and maternity — manual source review

The localized Patient Web route tree contains **no** `nutrition` or `maternity` page. A source scan of `app`, `components-next`, and `lib` found no nutrition/meal/calorie/water/food-scanner/body-composition code and no maternity/pregnancy/fetus/ovulation/baby-growth code, except profile field references that do not create a feature surface. Therefore no Web CTA→contract chain exists for the Mobile routes below.

| Mobile row range | Classification | Evidence-bounded gap |
|---|---|---|
| PM-165–PM-177 nutrition | `MISSING_CAPABILITY` | No nutrition hub, logging, meal plan, scanner, water tracker, body composition/target, exercise plan, AI plan/analyzer, data source, consent, safety warning, deletion or clinical escalation surface is present. |
| PM-145–PM-151 maternity | `MISSING_CAPABILITY` | No maternity hub/setup/pregnancy/ovulation/fetus/baby growth/development surface, date/gestational authority, medical disclaimer, consent, clinical escalation or PHI lifecycle is present. |

The absence is source-scoped only; this audit makes no statement about backend APIs, native Mobile behavior, clinical correctness, user data, or runtime availability.
