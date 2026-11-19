# The old `public_*` indexes of `medicines`: drop candidates, and the rare-category sort question (lane B, 2026-11-17)

Written for lead queue item 7. **Nothing is dropped here.** A drop is a separate owner-approved change after the evidence below.

## 1. Drop candidates (replaced, not yet proven unused)
| old index (`medicine.schema.ts`) | replaced by | why it can go | evidence still needed |
|---|---|---|---|
| `public_price_asc` { public_eligibility, medical_review_status, price:1, _id } | `public_live_price_asc_v2` { ..., price:1, id:1, is_deleted:1 } (#2715) | the old one has neither `id` nor `is_deleted`: a query with the public gate (`is_deleted: {$ne: true}`) fetched every document to test it (run 133/135) | `ops` = 0 in `$indexStats` over a normal-traffic window |
| `public_price_desc` { ..., price:-1, _id } | `public_live_price_desc_v2` | same | same |
| `public_newest` { ..., createdAt:-1, _id } | `public_live_newest_v2` | same | same |
| `public_most_ordered` { ..., orders_count:-1, _id } | `public_live_most_ordered_v2` | same | same |

Every medicines list that sorts by these keys now ends its sort in `id` (`MedicinesService.filtered` #2715, `publicCategoryProducts` #2738); a grep of `backend/src` finds no other sort on `_id` after these keys. The old indexes can still be CHOSEN by the planner for a query that has the keys but not `id`, which is the risk the drop removes (an old index is a way to fetch 20,990 documents).

**How to get the evidence: ops task `96v-index-usage.sh`** (read-only): per index `ops`, `since` (when mongod last started: the counters reset, so run it a few days after the restarts stop) and size, with the four old names tagged. Drop an old index only when `ops` stays 0 (or a few) while its `*_v2` twin shows the traffic. Mind the **write cost**: each of the 8 indexes is updated on every medicine write; dropping 4 also saves that (about 4 x 3-4 MB of index here).

**The drop itself** (when the lead approves, one PR): remove the four `MedicineSchema.index(...)` lines (the existing `public_live_*_v2` stay) and an ops task that runs `db.medicines.dropIndex(<name>)` for the four names, dry run by default, one index per run, with the 96r numbers before and after. Removing the line from the schema does not drop the index in production (Mongoose does not auto-drop); the ops step does.

## 2. The rare-category sort question
Question: a category page sorted by price (or newest / most ordered) filters by `category` and sub-category, but the v2 indexes serve the ORDER, not the category, so the category is tested per document while walking the index in order: a rare category (a few hundred products among 21,000) can examine far more than a page before it finds 24 matches.

Measured shape (explain tests, 3,000 docs of 5 KB, `seo-search/category-listing-explain.spec.ts`): "All" reads one page; a category/sub-category in front of a price order is where the walk gets long. Not measured on production data.

Options:
| option | cost | gain |
|---|---|---|
| **A. do nothing now** (recommended until a 96r shows it) | none | the category pages are cached (HotCache, stale-if-error) and the worst case is bounded by `maxTimeMS` 8 s + the concurrency gate (#2715, #2716, #2738) |
| B. one index per order with the category in front: { public_eligibility, medical_review_status, category, price, id, is_deleted } and the same for createdAt and orders_count | 3 new indexes (price asc and desc need 2 because the sort is mixed `{price:-1, id:1}`: 4 in all); each ~4 MB and one more write cost | a category page reads one page for every order |
| C. make the desc order `{price:-1, id:-1}` so ONE index serves asc and desc (an index is read backwards) | a visible change: ties among equal prices come out in the opposite id order for "price high to low" | halves B to 3 indexes |

Recommendation: **A now, and B/C only if the 96r slow-ops list (or 96v after the drop) shows a category listing with docsExamined much above its limit.** If it does, C+B (3 indexes with the category in front) replace the three category-less v2 indexes rather than add to them for the category pages, but the "All" page still needs the category-less ones, so they stay.
