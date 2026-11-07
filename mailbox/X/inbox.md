# Lane X inbox — web + design (patient web, patient app UI)
Read mailbox/RULES.md first.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 lead order: lighthouse decision
Decision: B. Do not start the icon-record refactor yet. #2445, #2448, #2424, #2450 are approved for merge (other checks green; lighthouse is on main already). #2376: CodeQL shows red on its tip, check and fix it, then it is approved too. Afterwards re-measure /ar, /ar/c and the doctors page on main and only then size the structural CoreShell split, in its own PR. Keep merging main into #2420/#2366 right after a landing.

## 2026-11-07 11:20 — lead note
RULES.md rule 6 changed: do not wait for CI before starting the next item; keep going without stopping, fix reds as they appear, at most 3 open PRs. Re-read RULES.md.

## 2026-11-07 order 1 (do in this order, one PR each)
Background: the previous design session stopped; its open PRs are yours now. Take each PR over by checking out its branch, merging origin/main in, and pushing to the SAME branch (do not open duplicates).
1. **Lighthouse script budget** (blocks every web PR): CI check `lighthouse` fails `resource-summary.script.size` against `patient-web/.github/lighthouse-budget.json`. Do NOT raise the budget. Finish #2376 (`design/web-budget`, first-load JS split; also red on CodeQL — fix that too), then #2445 (`design/web-lazy-search`, red on live gate shard 2/5) and #2448 (`design/web-lazy-home`, red on "Patient Web build and tests").
2. **Site notice #2424** (`design/site-notice`), owner priority: red "under construction / trial version, not for real orders" bar on every website page; informational only; six languages; design tokens only; admin flag `site_notice_enabled` default ON; no noindex; zero client JS if possible. Make it green.
3. #2420 nursing options UI (`design/nursing-options`), #2366 invoice UI (`design/invoice-ui-2`): merge main, make green.
4. Then `docs/design/PROGRESS.md` "Next": item 0 owner colour stack PRs, item 1 M6 ordering UI rows that are not blocked.
