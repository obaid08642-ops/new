# Lane X inbox — web + design (patient web, patient app UI)
Read mailbox/RULES.md first.

## 2026-11-09 06:45 — lead 3: next orders (one PR each)
1. PT-29 push permission denied (patient app): clear in-app state + settings link, no crash; test.
2. PT-27 prescription OCR result shown and corrected (web + app): the correction UI on the scanner result if the backend accepts corrections, else a Needs-review line.
3. PT-24 payment return into the APP (deep link back from the gateway lands on the result screen with the payment id); test.

## 2026-11-09 02:45 — lead 3: next orders (one PR each)
1. docs/design/needs-review/m6-blocked.json: rows now unblockable after M3-M8 + decision 1-3 (item names, prefill read by the flows, renew action): build the client parts that have a backend; leave the rest with a one-line reason.
2. PT-54 patient hides/unhides a visit from history (web + app; backend field if exists, else Needs-review line), PT-30 location-permission-denied state on web (clear message + manual address fallback), six languages.

## 2026-11-09 00:45 — lead 3
Decision 1: lane Z adds `family_member_id` to booking/order create (validated to the caller's family). Start the client part now on a new branch, wired to the existing family-members endpoint, default = the patient, sending `family_member_id` only when another member is chosen; keep it unmerged-ready until Z's PR lands (I merge Z first, then yours). Six languages, tokens only, RTL.

## 2026-11-08 18:00 — lead 3
Merged by me: #2420 and #2398 (Y). #2366 now conflicts (inventories, as expected): merge origin/main, regenerate inventories, push; I merge when green.

## 2026-11-08 17:15 — lead 3
Decision 2 ("prescription medicines pre-checked"): apply it literally and in both places with the same intent: (a) pharmacy: items that come from a doctor's prescription are pre-checked; (b) ordering screens (Ord03): the doctor's-order items are pre-checked. Pre-checked, NOT locked: the patient can untick (no hidden forced purchase). Say this in the PR body.

## 2026-11-08 16:25 — lead
OWNER DECISIONS for M6 ordering screens (binding): (1) an order can be for the patient or a family member; default = the patient. (2) Prescription medicines are pre-checked; the patient can uncheck. (3) Show all offers' prices sorted, best offer highlighted. Build them now, one PR per screen group.

## 2026-11-08 16:15 — lead 3
Right not to guess the M6 product rows; I list them for the owner. Next (no product call needed): widen the doctors-page lighthouse margin (1.9 KB): lazy-load the consult card chunk (~10 KB) on /ar/consultations/doctors, new branch `x/doctors-js`, same measuring table in the PR. While merges are stalled you may hold 4 open PRs.

## 2026-11-08 13:15 — lead 3
Merged: #2424 #2445 #2448 #2482. Left: #2420 then #2366 (both green + approved) — keep them merged with main; next: PROGRESS.md "Next" items.

## 2026-11-08 09:45 — lead
Merged: #2424 (site notice), #2445, #2448, #2482. #2420 and #2366 now have MERGE CONFLICTS with main: merge origin/main into each (same branch), resolve, push, keep green.

## 2026-11-08 12:45 — lead 3
All green and approved: #2424 #2445 #2448 #2420 #2366 #2482. Merge order (owner merges): #2424, #2445, #2448, #2482, #2420, #2366. After each landing, re-merge main into the next and regenerate inventories (#2420/#2366 conflict) so they stay green.

## 2026-11-08 11:15 — lead 3
LiveKit download works again (since ~11:00). Re-run failed live-gate jobs once on your PRs now (or merge main after #2479 lands); fix only non-download reds.

## 2026-11-08 10:46 — lead 3
#2376 is merged (main e483e477). Now merge main into #2424 first, then #2445 #2448 #2420 #2366, regenerate inventories, check lighthouse on each.

## 2026-11-08 10:45 — lead 3
Live gate is red on every PR because the LiveKit v1.10.1 download itself is broken (not your code). Lane Y fixes it in #2479. Do not chase those reds; after #2479 lands, merge main into your PRs. Keep working on your next items.

## 2026-11-08 09:15 — lead
#2376 is MERGED (Lighthouse green on main). Now merge origin/main into #2424 (site notice, owner priority), #2445, #2448, #2420, #2366 (same branches) so Lighthouse re-runs green; fix anything still red. #2482 also: CodeQL + live gate.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

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
