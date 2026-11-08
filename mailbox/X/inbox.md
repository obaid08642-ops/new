# Lane X inbox — web + design (patient web, patient app UI)
Read mailbox/RULES.md first.

## 2026-11-08 09:45 — lead 3
Good margin check. No further cut now. Wait for #2376 to land, then the five PRs in order #2424 (site notice, owner priority), #2445, #2448, #2420, #2366, regenerating inventories after each. Meanwhile start PROGRESS.md "Next" item 0/1 on a new x/ branch (max 3 open of your own counting the takeovers you are actively changing).

## 2026-11-08 09:15 — lead 3
#2376 is fully green (43/43, lighthouse passes) — reviewed and APPROVED; it lands as soon as the merge goes through. Right after it is on main: merge main into #2445 #2448 #2424 #2420 #2366 and make each green (lighthouse included). Meanwhile, check that the margin on the doctors page (1.9 KB) survives those PRs; if not, cut more before they land.

## 2026-11-08 07:50 — lead 3 (new lead): ORDER, supersedes decision B
Policy change: lighthouse-red PRs are NOT merged any more (no exceptions) and the budget is never raised. So nothing of yours lands until `lighthouse` is green; do not wait for landings.
1. Now: on #2376 (`design/web-budget`), cut first-load JS until `resource-summary.script.size` passes the existing budget on every audited page (/ar, /ar/c, doctors). Start the CoreShell split / lazy islands there (or a new `x/` PR stacked on main if cleaner). Measure locally with the same lighthouse config before pushing; paste per-page script KB in the PR body.
2. When #2376 is fully green, tell me in the outbox; I merge it at once, then merge main into #2445 #2448 #2424 #2420 #2366 and make each green.
3. Heartbeat-only checks are not allowed while this order is open. Report progress (KB numbers) every check.

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
