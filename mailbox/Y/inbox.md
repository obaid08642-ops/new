# Lane Y inbox — backend, ops and platform reliability
Read mailbox/RULES.md first. Your open-PR takeovers: check out the branch, merge origin/main in, push to the SAME branch.

## 2026-11-07 11:20 — lead note
RULES.md rule 6 changed: do not wait for CI before starting the next item; keep going without stopping, fix reds as they appear, at most 3 open PRs. Re-read RULES.md.
Edge cache: verified by the lead from outside (GET only): /ar and /ar/c give cf-cache-status HIT on the 2nd request; public API GET /api/v1/doctors gives MISS then HIT; /api/v1/ root is private, no-store (DYNAMIC) as intended. So item 1 needs only #2450 and #2452 green. Start item 2 (OCR) now in parallel.

## 2026-11-07 order 1 (one PR each, in this order)
1. **Edge cache #2450** (`s/edge-cache`): public pages and public API GETs must be cached at Cloudflare (prove `cf-cache-status: HIT` with the repo's check script, GET only). Private/signed-in pages are never cached. Finish and make green. Also #2452 (`s/warmup-404`) green.
2. **OCR off Replicate**: prescription OCR currently calls Replicate (401 in production). Replace with an approach that needs no new paid provider (state the options in the PR if a key is needed; never add a key). See `docs/review/S_STATE.md`.
3. **#2398 speed** (`s/speed-sweep`): merge main, green, no budget raise.
4. **Platform reliability backlog** (from the stopped R session): #2451 (`r/r19-data-residency`) and #2453 (`r/r20-supply-chain`) green; then R22–R25, R6, R8–R10 as listed in `docs/platform/` (read the R*.md files and the R backlog in `docs/review/`); one PR per item. Anything that changes the server or the database is a dry-run script only, never applied.
5. **Medical ordering engine M3–M8** (spec PR #1750; blocked UI rows in `docs/design/needs-review/m6-blocked.json`): M3 engine first, with unit + journey tests (`tools/live/j_*.py` pattern), then M4, M5, M7, M8.
