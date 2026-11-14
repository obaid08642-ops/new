# Catalogue ingredients (issue 1556, PR 1): INN normalization table and coverage

Status: dry run only. The migration `backend/scripts/migrations/2026-10-catalogue-ingredients.ts` has no `--apply`
mode yet. The owner signs off this table before any write, and nothing runs on production.

## Coverage (dry run, parser p1/2026-10-16.1)

| Source | In-scope rows | Result |
|---|---|---|
| Local test database `nabd_live` | 0 | The test rows are in other categories, so the scope filter drops them all. No numbers. |
| Repo fixture `backend/src/scripts/__fixtures__/catalogue-sample.json` | 4 (17 out of scope) | All 4 parse to `none` (no active ingredient, no INN), 4 keep dosage form and route. |

The production coverage report (counts per field before and after, per the issue) needs a read-only run against
the production snapshot. This PR does not claim any production number.

Command for that run (read only):

```
MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-catalogue-ingredients.ts --samples=5
```

## INN normalization table (for the owner's sign-off)

Each row is one INN with the spellings that map to it (Arabic and English). Parent groups are blank where none exists.
The table is generated from `backend/src/modules/medicines/inn-normalization.ts` (`INN_ENTRIES`, version 2026-10-16.1),
44 entries.

| INN | parent | aliases (spellings mapped to this INN) |
|---|---|---|
| paracetamol |  | باراسيتامول, بارسيتامول, paracetamol, acetaminophen, اسيتامينوفين |
| ibuprofen |  | ايبوبروفين, ibuprofen |
| ketoprofen |  | كيتوبروفين, ketoprofen |
| loxoprofen |  | لوكسوبروفين, loxoprofen |
| diclofenac |  | ديكلوفيناك, diclofenac |
| diclofenac sodium |  | ديكلوفيناك الصوديوم, ديكلوفيناك صوديوم, diclofenac sodium |
| diclofenac potassium |  | ديكلوفيناك البوتاسيوم, ديكلوفيناك بوتاسيوم, diclofenac potassium |
| acetylsalicylic acid |  | حمض اسيتيل الساليسيليك, حمض الاسيتيل ساليسيليك, acetylsalicylic acid, aspirin |
| pseudoephedrine |  | سودوافدرين, سودوافدرين هيدروكلوريد, pseudoephedrine, pseudoephedrine hydrochloride |
| chlorphenamine |  | كلورفينيرامين, كلورفينيرامين ماليات, chlorphenamine, chlorpheniramine, chlorpheniramine maleate |
| triprolidine |  | تريبروليدين, triprolidine |
| diphenhydramine |  | ديفينهيدرامين, ديفينهيدرامين هيدروكلوريد, diphenhydramine, diphenhydramine hydrochloride |
| caffeine |  | كافيين, caffeine |
| codeine |  | كودايين, كودين, codeine |
| chlorzoxazone |  | كلورزوكسازون, chlorzoxazone |
| amoxicillin |  | اموكسيسيلين, اموكسيسلين, amoxicillin |
| clavulanic acid |  | حمض كلافولانيك, حمض الكلافولانيك, clavulanic acid |
| omeprazole |  | اوميبرازول, omeprazole |
| sodium bicarbonate |  | بيكربونات الصوديوم, sodium bicarbonate |
| metformin |  | ميتفورمين, ميتفورمين هيدروكلورايد, ميتفورمين هيدروكلوريد, metformin, metformin hydrochloride |
| empagliflozin |  | امباجليفلوزين, empagliflozin |
| dapagliflozin |  | داباجليفلوزين, dapagliflozin |
| sitagliptin |  | سيتاجليبتين, sitagliptin |
| vildagliptin |  | فيلداجليبتين, vildagliptin |
| alogliptin |  | الوجليبتين, alogliptin |
| pioglitazone |  | بيوجليتازون, pioglitazone |
| glibenclamide |  | جليبنكلاميد, glibenclamide, glyburide |
| glimepiride |  | جليمبريد, glimepiride |
| cetirizine |  | سيتيريزين, cetirizine |
| loratadine |  | لوراتادين, loratadine |
| desloratadine |  | ديسلوراتادين, desloratadine |
| alfacalcidol |  | الفاكالسيدول, alfacalcidol |
| vitamin d |  | فيتامين د, vitamin d |
| colecalciferol | vitamin d | فيتامين د3, فيتامين د 3, كوليكالسيفيرول, كولي كالسيفيرول, vitamin d3, cholecalciferol, colecalciferol |
| ascorbic acid |  | فيتامين سي, فيتامين ج, حمض الاسكوربيك, vitamin c, ascorbic acid |
| calcium |  | كالسيوم, calcium |
| zinc |  | زنك, zinc |
| iron |  | حديد, iron |
| levocarnitine |  | ل - كارنتين, ل - كارنيتين, l - carnitine, levocarnitine |
| omega-3 fatty acids |  | اوميجا 3, اوميغا 3, omega 3, omega - 3 |
| docosahexaenoic acid |  | دي اتش ايه, dha |
| dexpanthenol |  | ديكسبانثينول, دكسبانثينول, dexpanthenol |
| panthenol |  | بانثينول, برو فيتامين ب5, بروفيتامين ب5, بروفيتامين b5, provitamin b5, panthenol |
| chlorhexidine |  | كلورهيكسيدين, chlorhexidine |

## Additions in table 2026-10-23.1 (issue 1556, PR 2) — for the owner's sign-off

Taken from the active ingredients of the test catalogue (`nabd_live`). The seed data carries no `active_ingredient`
values. The Arabic spellings below are proposals and need the owner's approval before any queued row is approved.

| INN | aliases added |
|---|---|
| azithromycin | ازيثرومايسين, ازيثروميسين, azithromycin |
| tramadol | ترامادول, tramadol |
| clavulanic acid (existing entry) | clavulanate (English alias added) |
