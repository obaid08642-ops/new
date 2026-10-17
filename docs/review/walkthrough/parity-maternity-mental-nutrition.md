# Parity: maternity, mental health, nutrition (web vs app vs board CareHub)

Screens compared: /maternity (pregnancy, baby, ovulation tabs, week content), /maternity/maternity-setup, /mental-health (hub), /mental-health/mood (journal), /nutrition (today, plan, target tabs), /nutrition/log-meal; all old sub-routes checked as redirects. There is no /pregnancy or fetal-weeks route on web or app; the week content is inside the maternity pregnancy tab. Board: docs/design/canvas/CareHub.dc.html (maternity template).
Gaps: missing 12, different 5, wrong 0, illogical 0, broken 0 (17 rows).
Method: static reading of web pages/components and patient-app/src/components/care/{Maternity,MentalHealth,Nutrition}Views.tsx; no render was run. The web baby-growth tab, kick/contraction logs and mental-health stats tiles have no app equivalent and are not counted as gaps.

| screen | element or section | in the app or board | on the web | expected | web file:line | class |
|---|---|---|---|---|---|---|
| /maternity pregnancy | "تقديري" (estimate) pill on the hero | pill under the week ring | no badge on the pregnancy hero (only the ovulation hero has one) | add the estimate badge | patient-web/app/[locale]/maternity/page.tsx:115 | different |
| /maternity pregnancy | board quick actions "حاسبة الولادة" and "مواعيد المتابعة" | shortcut tiles under the hero | not present (two cards to gynecology consult and scans instead) | add the due-date calculator and follow-up appointments entries or drop from the board | patient-web/app/[locale]/maternity/page.tsx:96 | missing |
| /maternity pregnancy | "كل المقالات" next to "اقرئي هذا الأسبوع" | link in the section header (board) | no link; only the week's articles | add a link to the articles list | patient-web/app/[locale]/maternity/page.tsx:199 | missing |
| /maternity ovulation | day-of-cycle ring and cycle length line | ring "day x of y", "N days" line, estimate pill | hero without ring; no day of cycle or length | add the ring and the cycle-length line | patient-web/app/[locale]/maternity/page.tsx:257 | missing |
| /maternity | safety notices | pregnancy/cycle warning plus a separate safety notice | one notice only | show both notices | patient-web/app/[locale]/maternity/page.tsx:98 | different |
| /maternity/maternity-setup | notices | pregnancy/cycle warning and "not a contraception" notice | one generic setupNotice | add the contraception and path-specific notices | patient-web/components-next/maternity-setup-client.tsx:84 | missing |
| /mental-health/mood | mood form tags | six tags (calm, tired, stressed, connected, rested, overwhelmed) | no tags field | add tag chips | patient-web/components-next/health/quick-log-form.tsx:19 | missing |
| /mental-health/mood | energy and stress input | 1 to 5 tiles | number inputs 1 to 5 | tile or segmented choice | patient-web/components-next/health/quick-log-form.tsx:23 | different |
| /mental-health/mood | history rows | mood, date, note and tags | mood, energy, stress, sleep, date; notes and tags not parsed or shown | show the note and tags | patient-web/app/[locale]/mental-health/mood/page.tsx:136 | missing |
| /nutrition today | remaining calories line | "الباقي: N" under consumed / target | date and target lines only | add remaining | patient-web/app/[locale]/nutrition/page.tsx:132 | missing |
| /nutrition today | macros | protein, carbs, fat tiles | calories and water tiles only | add the macro tiles | patient-web/app/[locale]/nutrition/page.tsx:137 | missing |
| /nutrition today | water | progress bar, target, +250 and +500 ml buttons | tile plus a free-amount form, no bar or target | bar with target and the two quick buttons | patient-web/app/[locale]/nutrition/page.tsx:141 | different |
| /nutrition today | no calorie target | button to open the Target tab | text "no target" only | button to the target tab | patient-web/app/[locale]/nutrition/page.tsx:134 | missing |
| /nutrition today | meal rows | name, kcal, protein, meal type pill | name, type, kcal; no protein | add protein | patient-web/app/[locale]/nutrition/page.tsx:157 | missing |
| /nutrition today | safety notice | "nutritionSafety" notice under the log button | none on the tab | add the notice | patient-web/app/[locale]/nutrition/page.tsx:163 | missing |
| /nutrition plan | plan needs a profile | warning plus a button to the Target tab | message only | button to ?tab=target | patient-web/components-next/nutrition-plan-generate.tsx:27 | missing |
| /nutrition/log-meal | macro fields | protein, carbs, fat, fiber (optional) sent in the body | only name, calories, type | add the four optional fields | patient-web/components-next/nutrition-log-meal-form.tsx:35 | missing |

No gap: /maternity/baby-development, /maternity/baby-growth, /maternity/ovulation, /maternity/tracker, /mental-health (hub), /mental-health/breathing, /meditation, /relax, /crisis-contacts, /self-assessment, /therapist-match, /nutrition/ai-meal-planner, ai-plan-builder, body-composition, body-target, calorie-analyzer, daily-tracker, exercise-plan, food-scanner, plan, water-tracker (all redirect to the matching hub/tab or the removed-feature target).
