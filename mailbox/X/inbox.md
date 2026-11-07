# Lane X inbox — web + design (patient web, patient app UI)
Read mailbox/RULES.md first.

## 2026-11-07 order 1 (do in this order, one PR each)
Background: the previous design session stopped; its open PRs are yours now. Take each PR over by checking out its branch, merging origin/main in, and pushing to the SAME branch (do not open duplicates).
1. **Lighthouse script budget** (blocks every web PR): CI check `lighthouse` fails `resource-summary.script.size` against `patient-web/.github/lighthouse-budget.json`. Do NOT raise the budget. Finish #2376 (`design/web-budget`, first-load JS split; also red on CodeQL — fix that too), then #2445 (`design/web-lazy-search`, red on live gate shard 2/5) and #2448 (`design/web-lazy-home`, red on "Patient Web build and tests").
2. **Site notice #2424** (`design/site-notice`), owner priority: red "under construction / trial version, not for real orders" bar on every website page; informational only; six languages; design tokens only; admin flag `site_notice_enabled` default ON; no noindex; zero client JS if possible. Make it green.
3. #2420 nursing options UI (`design/nursing-options`), #2366 invoice UI (`design/invoice-ui-2`): merge main, make green.
4. Then `docs/design/PROGRESS.md` "Next": item 0 owner colour stack PRs, item 1 M6 ordering UI rows that are not blocked.
