# Lead briefing — everything the lead needs (from the old lead, 2026-11-07 16:30 UTC)
Read once, fully. Public repo: no secrets, server names, IPs or emails here or anywhere.

## 1. Who is who
- **Owner**: writes in Egyptian Arabic; answer in short Egyptian Arabic. Only approves server deploy runs (the "Approve" button on a GitHub Actions run). Everything else you decide and drive.
- **You (Lead 2)**: the only session on the owner's main account. Woken at :07 and :37 every hour by scheduled tasks. Role: review, merge, deploy runs, give orders to lanes, keep the project moving to completion without the owner.
- **Lanes** (Claude sessions on the owner's two other Pro accounts; you cannot message them, see 2):
  | Lane | Account | Work | Branch prefix |
  |---|---|---|---|
  | X | account A | patient web + design (Lighthouse script budget, site notice #2424, #2376 #2445 #2448 #2420 #2366, design PROGRESS.md Next) | x/ (takes over design/*) |
  | Z | account A | payments, booking, refunds, payouts (#2404, #2456, halala migration, money scenarios) | z/ (takes over f/*) |
  | Y | account B | backend, ops, reliability (#2450 edge cache, #2398, #2451, #2453 CodeQL, uptime probe 404, gitleaks fixtures, Android manifest merger) | y/ (takes over s/*, r/*) |
  | W | account B | provider app + admin (#2455, PV scenarios, screens-audit-3, P_STATE leftovers, admin passkey step-up UI) | w/ (takes over p/*) |
- All old sessions on this account are stopped with wake-ups disabled (old lead, Design, S, S2, R, F, P2, T2, H, F3, P3). Do not restart them.

## 2. How you talk to the lanes (GitHub branch `mailbox`)
- `mailbox/RULES.md` — binding rules for lanes (read it; you may edit it).
- `mailbox/<L>/inbox.md` — YOUR orders to lane L, newest at the top. Only you write it.
- `mailbox/<L>/outbox.md` — lane L's reports, newest at the top: time, item, status, PR + CI, what changed, blockers/questions.
- Lanes check their inbox every 30 min (their own scheduled tasks). So: to give an order, add a dated section at the TOP of their inbox, commit, `git push origin mailbox`. They answer in the outbox. Questions in an outbox must be answered in the inbox the same run.
- `docs/review/LEAD_NOTES.md` on mailbox: old channel for F3/P3, no longer used.
- A lane silent > 6 h (no outbox commit): probably its Pro usage limit; tell the owner once (he can open that account and type "continue").
- Y's scheduled task expires ~2026-11-14: remind Y on 11-12 to renew.

## 3. Each check (every 30 min)
1. `git fetch origin main mailbox`. Top entry of each outbox. `gh pr list --state open --json number,headRefName,updatedAt` (gh works through the proxy).
2. Nothing new → stop (2–3 tool calls).
3. New/updated PRs: review (`git diff --stat origin/main...origin/<branch>`, then risky files only: auth, payments, DB, infra). Sound → add number to `lead/approved.txt`. Then run `LEAD_DIR=$PWD/lead bash lead/oncepass.sh` from a mailbox checkout: it merges every approved PR whose latest checks are all green except `lighthouse` (it prints FAILED lines for red ones). Never merge red; never approve your own PRs.
4. Red PR → fix order in the owning lane's inbox, with the failing check name and the key log lines (`gh run view <id> --log-failed | grep -iE "error|fail" | tail`).
5. Lane done with an order → write the next order (from its queue in this file, PROGRESS.md, SCENARIOS.md, screens-audit-3.md, docs/platform/R*.md).
6. Red runs on main: `gh run list --branch main --status failure -L 10`; root-cause in a few lines; order to a lane.
7. Merges landed since the deployed SHA → deploy run (section 4) and send the owner the link.
8. Update `lead/LEAD_STATE.md` (time, deployed SHA, open PRs, changes), push mailbox. Short Egyptian Arabic note to the owner only if there is a link, a decision, or a real result.

## 4. Server deploys (owner approves; you never touch the server directly)
- Branch `review/server-inspect`. File `tools/ops/RUN`: comment lines (# date, run number, what it brings), then `release:<full main SHA>`, then task names, one per line. Standard deploy:
  ```
  # <date> lead: run <n> = deploy main@<sha8>.
  # Brings: <PR list in plain words>
  release:<full sha>
  97-free-old-predeploy
  93-free-unused-images
  60-deploy-main
  cf-purge-api
  ```
- Also set the default SHA in `tools/ops/tasks/60-deploy-main.sh`: `sed -i "s/OPS_RELEASE_SHA:-[0-9a-f]*/OPS_RELEASE_SHA:-<full sha>/"`.
- Commit `ops run <n>: deploy main@<sha8>`, push. A "server-ops" workflow run starts in "waiting" state: `gh api "repos/obaid08642-ops/new/actions/runs?branch=review/server-inspect&per_page=3" --jq '.workflow_runs[]|select(.name=="server-ops")|.html_url'` → send that link to the owner to approve.
- After it completes: `gh run view <id> --log | grep -E "deploy: DONE|ROLLBACK|health="`. DONE = live (backup + rollback images kept). ROLLBACK = root-cause before anything else.
- Last runs: 97–100 (11-03), 101 = main@641bbe2f DONE 2026-11-07. Next run number: 102.
- Cloudflare tasks are `cf:<name>` lines (scripts in tools/ops/cf/), check scripts first, apply only after owner OK. Anything that writes to the server/DB: dry-run task first, owner approval, backup.
- Never: delete volumes, delete running images, print secrets; production checks are GET only.

## 5. Known state (2026-11-07 16:30)
- Production 200; edge cache HIT verified (pages + /api/v1/doctors); admin passkey fix deployed (#2438) — owner should test admin login with fingerprint.
- Blocker for all web PRs: Lighthouse `resource-summary.script.size` over budget (174,080 B; pages at 175–181 KB). Never raise the budget; lane X is cutting first-load JS (#2376 first).
- Open PRs: X: 2376 (CodeQL+lighthouse), 2445, 2448, 2424, 2420, 2366 (lighthouse only). Y: 2450, 2451 (green, approved — merge), 2398 (lighthouse), 2453 (CodeQL). Z: 2404 (lighthouse), 2456 (new). W: 2455 (new). H draft 2225 (iOS native E2E) — leave. Old drafts 1967 1891 1897 2015 1924 2336 — ignore.
- Y reported: OCR already off Replicate on main, ordering M3–M8 already on main (verify quickly, then close those items); asked what R6, R8–R10, R22–R25 are — look in docs/platform/ and docs/review/ for the R backlog; if not defined, drop them and tell Y.
- Red on main (11-07): uptime-alert (probe URL 404, false alarm → Y), Security Scan gitleaks full history 24 fixture findings (→ Y, add fingerprints with reasons), Native E2E Android manifest merger (→ Y), OWASP ZAP (runner port clash, retry once).

## 6. Owner rules (also in lead/OWNER_DECISIONS.md — binding)
Never skip/disable tests, never raise budgets, no secrets in chat/repo, no model names in commits/PRs, no paid services without price approval, site notice decision, LiveKit self-hosted, one bigger VPS at launch. Owner to-dos to remind once: GitHub secrets for uptime alert mail; Moyasar/APNs/social login keys; standby VPS/KSA hosting/RAM decisions; earlyoom apply.
