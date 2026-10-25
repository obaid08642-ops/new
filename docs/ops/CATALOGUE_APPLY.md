# Catalogue apply (production data, owner-approved 2026-10-25)

One server-ops task, `tools/ops/tasks/90-catalogue-apply.sh`, runs the tool `node dist/scripts/catalogue-apply.js` **inside the backend
container** (so it uses the container's own `MONGO_URL` / `DB_NAME`; the tool prints counts, hashes and variable names only).

## What it applies (all idempotent, all guarded)
| Step | Writes | Source |
|---|---|---|
| `medicine_translations` | `translations.<ur\|hi\|bn\|tl>.<name\|official_name>` of medicines, only where the stored value is empty or still English (#1844) | the reviewed CSV shipped in the image (`src/modules/medicines/data/`, same bytes as `data/catalogue-input-01/`) |
| `names_ar_en` | `name_ar` / `name_en` of regions, cities and insurers, only where empty | the central seeds (two languages only, owner decision 2026-10-25) |
| `medicine_name_hygiene` | leading, trailing and double spaces in `name_ar` / `name_en` of medicines (never a letter) | the database |
| `medicine_name_fixes` | the Arabic name fixes the owner approved (#1556 decision A), through the script's own checks | `$IN/approved-name-fixes.csv` (optional) |
| `districts` | district centroids and new districts, each row with its `source` (item 5) | `$IN/districts.json` (optional) |

Not in this task: the ingredient normalisation, merge pairs, variant groups and picture imports of #1556 (their own migrations under
`backend/scripts/migrations/`), and the pre-existing production state of the `medicines` collection.

## How a run goes
1. **Dry run** (`EXPECT_PLAN_SHA=""` in the task file, the committed state): prints `status:` lines with the plan, counts per step and the plan's
   SHA-256. Nothing is written.
2. The owner reads the counts. The reviewer sets `EXPECT_PLAN_SHA=<hash>` in the task file and runs the task again.
3. **Apply**: the plan is recomputed and must have the same hash (otherwise nothing is written); a **backup** of every field the plan changes
   (before-images) and every document it inserts is written, read back and hashed, and a copy goes to `/opt/nabdah/backups/catalogue-<ts>.json.gz`;
   the writes run as compare-and-set (a field edited since the plan is skipped, never overwritten); then a **fresh plan must be empty** and the
   document counts must be the expected ones.
4. Any mismatch → **rollback from the backup** (a field returns to its before-image only while it still holds what the apply wrote; inserted
   documents are deleted) and the counts are checked again. Exit 1.

Manual rollback later: `docker cp /opt/nabdah/backups/catalogue-<ts>.json.gz nabdah-backend:/tmp/b.gz` then
`docker exec nabdah-backend node dist/scripts/catalogue-apply.js rollback --backup=/tmp/b.gz`.

## Before it can be listed in `tools/ops/RUN`
- The release carrying `dist/scripts/catalogue-apply.js` must be deployed (the task aborts with a clear line otherwise).
- It must pass `.github/workflows/ops-rehearsal.yml`: the rehearsal backend is a stub, so a fixture with this tool and a seeded database is
  needed first. Locally the task was run against a local MongoDB with `docker` / `sudo` shims: dry run, wrong hash (aborts), apply (backup,
  guarded writes, empty fresh plan), a repeat dry run (0 changes) and a rollback (state and plan hash identical to before).
- After medicine names change, list `cf-purge-api` in that run so the cached product pages refresh.
