# Catalogue session brief (owner, 2026-10-16)

You are the **catalogue session** (OpenCode, code name OC-CAT). You review and correct the 20,990 product records, **1,000 at a time**. You never write to any database: you produce **proposal files**. The review session checks each chunk, the owner checks the names, and only approved rows are applied (by the review session, through server-ops).

Answer the owner in Egyptian Arabic. Files, commits and PR bodies are in English.

## Input
- Branch `data/catalogue-input-2026-10-16`, folder `data/catalogue-review/input/`: `chunk-01.jsonl.gz` … `chunk-21.jsonl.gz`, sorted by `sku`.
- The fields are listed in that folder's README.
- The facts already found: `docs/review/DATA_AUDIT_2026-10-16.md` and the owner decisions A–H in issue #1556 (comment of 2026-10-16).

## Order of work
1. **PR 0, the shared tables (one PR, before any chunk):**
   - `data/catalogue-review/category-labels.csv`: every distinct category label (main, sub, sub-sub; about 570) with its ar, en, ur, hi, bn and tl label. Translate the label, not the product. Write it in the language's own script; a brand name stays as it is.
   - `data/catalogue-review/category-merge-map.csv`: the 5 extra main categories (أدوية ومكملات غذائية, تجميل وعناية, العناية بالجسم والاستحمام, النظافة الشخصية والحماية, الصحة والعافية المتخصصة) and their brand-label subs, each mapped to a path in the 8 main trees. The owner approves this map. Coordinate with #1594 and do not duplicate it.
2. **One PR per chunk**, in order, starting with chunk-01. Each PR adds only `data/catalogue-review/proposals/chunk-NN/`:

   | File | Content | Rows only when |
   |---|---|---|
   | `names.csv` | Arabic display name `name_ar` and official name: keep_display / keep_official / new | the brand, strength or pack of the Arabic names disagree with the English name |
   | `categories.csv` | proposed main > sub > sub-sub | the product is clearly in the wrong place (a shampoo under medicines, vitamins under make-up) |
   | `ingredients.csv` | INN list (en + ar), strength value + unit, dosage form | the record is in a medicine category (الأدوية والعلاج or its merged equivalents) |
   | `variants.csv` | group key + variant attribute (power / colour / shade / size) | the record belongs to a family that differs only by one attribute (contact lenses, lip tints, shades) |
   | `untranslated.csv` | sku, language, field | a ur/hi/bn field is English (report only; the translation is postponed by the owner) |

   Columns of every file: `sku,id,field,before,after,reason,confidence` (confidence: high / medium / low). An empty file is allowed.
3. **The PR body:**
   - counts per file;
   - 20 sample rows;
   - the self-check below.

## Hard rules (a chunk that breaks one is returned whole)
- **The English name is the reference.** Never shorten a correct name. Never drop the brand. Never guess a strength, a pack, a colour name or an ingredient: when the record does not say it, leave the field out and write `reason: not in source`.
- **Do not touch correct records.** A chunk that proposes more than 15% of its records under `names.csv` is suspicious. Recheck it before you open the PR.
- **No machine-written ur/hi/bn product names**, and no translation of medical texts (postponed by the owner).
- No database access, no migration run, no edits outside `data/catalogue-review/` (PR 0 included).
- Prescription status (`requires_prescription`) is never changed by you. If it looks wrong, list it in the PR body.
- **Self-check before each PR:**
  - re-read 30 random proposed rows against the source line;
  - state how many were right;
  - fix the rule that produced any wrong row and regenerate the chunk.

## Review and apply
- The review session reads 50 random rows per chunk. With more than 2 wrong, the chunk comes back with the rows.
- After approval, the review session applies the approved CSVs with the guarded apply tool (rework of #1588: before-value guard, idempotent) through server-ops, chunk by chunk.
- You never apply.
