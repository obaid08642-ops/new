# Catalogue review input (export of 2026-10-16, server-ops run 38849057276)

21 gzipped JSONL files of 1,000 medicines records each (20,990 in all), sorted by `sku`. These are public product
fields only (the same data the site shows), with no patient or account data. Fields per line:
`id, sku, category, sub_category, sub_sub_category, requires_prescription, price, active_ingredient, strength, form,
package_size, images, description_ar/en` (first 400 characters), `name_ar, name_en`, and `names.{ar,en,ur,hi,bn,tl}.{name,
official_name, main_category, sub_category, sub_sub_category}`.

This branch is input only and is never merged into main. Proposals go to main as small CSV files under
`data/catalogue-review/proposals/` (see `docs/review/CATALOGUE_SESSION_BRIEF.md`).
