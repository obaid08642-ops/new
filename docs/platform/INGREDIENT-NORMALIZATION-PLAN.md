# Catalogue active ingredient: plan, dry run, gates (issue #1556, lane B, 2026-11-16)

Plan and a **read-only** dry run. Nothing in this PR writes to the catalogue. No INN spelling is invented: the spelling table is empty until the owner approves it.

## 1. Scope (owner decisions on the issue, 2026-10-16, point H)
- Normalize `active_ingredient` to a structured `ingredients: [{ inn, strength_value, strength_unit }]`, plus `dosage_form` and `route`.
- Review queue: **only products in the medicine categories** (2,575 records in the review session's export). Cosmetics and devices need no ingredient and stay out. Which categories count is the owner's list: the dry run prints counts per category (`category` is the stored label) so the list can be made from numbers.
- Images: **withdrawn** (the pictures exist, comment of 2026-10-16). Equivalents (#1547) come after this and use the normalized INN set + strength + form.
- Numbers quoted on the issue (review session, production export of 20,990 medicines): about 2,621 non-empty values in 1,323 spellings, about 620 products with no ingredient text, 141 with leaflet text. The dry run below measures them again with the code, on the same data.

## 2. What this PR adds
| piece | file | what it does |
|---|---|---|
| parser (pure) | `backend/src/modules/medicines/ingredient-parse.ts` | `empty` / `leaflet` / `confident` / `review` per product; splits combinations (`+ & ; , and و`, never `/`), reads strengths (`500 mg`, `5mg/5ml`, `0.025 %`, Arabic units), normalizes spellings (case, Arabic diacritics, alef/ya, strength and form words removed) |
| spelling table | `docs/platform/ingredient-inn-map.json` | **empty**, `approved_by: null`. A table without `approved_by` is ignored whole, so nothing is mapped from a draft |
| dry run | `backend/src/scripts/ingredient-dry-run.ts` | streams the medicines (4 fields, batch 200, 5 min limit), prints counts per status and category, strengths read, and the most frequent unmapped spellings. No ids, no names, no writes, no `--apply` |
| ops task | `tools/ops/tasks/96s-ingredient-dry-run.sh` | runs the script inside the backend container with a 160 MB heap and 10 min limit, refuses above 80 % of the container memory, masks connection strings. Same pattern as 96i |
| tests | `ingredient-parse.spec.ts` (16), `ingredient-dry-run.spec.ts` (4), `test_ingredient_dry_run_task.py` (6) | including: an unapproved table maps nothing, one unknown component makes the whole product `review`, the script contains no write call |

**What the statuses mean.** `confident` = every component's spelling is in the approved table (so the INN is the owner's, not mine). `review` = anything else, including every ingredient text while the table is empty: it goes to the admin's change-request queue. `leaflet` = text that is not an ingredient (longer than 160 characters, a link, a line break, or leaflet wording): a person moves it to the right description field. `empty` = nothing stored.

## 3. Steps and gates
| step | what | gate |
|---|---|---|
| 1 | run `96s-ingredient-dry-run.sh` (read-only, the lead schedules it) and paste the output on the issue | none: counts only |
| 2 | from the "most frequent spellings" lines the owner (or a pharmacist) writes the INN for each, into `ingredient-inn-map.json` and sets `approved_by` | **owner approval of the table**. I do not fill it: an INN mapping is a medical statement |
| 3 | re-run the dry run with the table (`INN_MAP_FILE`): the coverage after the table, still no writes | numbers go in the PR body |
| 4 | the migration (a separate script, written after step 3): writes `ingredients[]`, `dosage_form`, `route` for `confident` products only; `review` and `leaflet` go to the existing change-request mechanism (`pending_revision` on the medicine, F8) for a person; dry run first, a backup first | owner approval, run on a copy of production in the live gate first, never on production without the owner |
| 5 | purge the product pages by tag after the write | with step 4 |
| 6 | equivalents (#1547) read the normalized set | after step 4 |

## 4. Open points (owner)
1. Which categories are "medicine categories" (the queue scope).
2. Who approves INN entries (the owner, a pharmacist, both).
3. Where leaflet text goes: which description field, or the review queue only.
4. `dosage_form` and `route`: the stored `form` is free text too; the same table approach is needed for forms. Not built here.
5. Whether the migration keeps the old `active_ingredient` text (recommended: yes, untouched, so nothing is lost and the search index keeps working).

## 5. Honest limits
I could not run it on production data (no access), so no coverage number is claimed here. The parser is tested on constructed examples, not on the real 1,323 spellings; step 1 is what shows how it behaves on them.
