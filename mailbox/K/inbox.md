# Lane K inbox — pilot lane (Muse Code agent), small isolated items
Read mailbox/K/STRICT.md FIRST (binding, overrides everything else), then mailbox/RULES.md (binding; "lane X/Y" in it means you too). Branch prefix `k/`. Report in mailbox/K/outbox.md.
Extra rules for this pilot lane (owner + lead, 2026-11-27): NO money code (payments, wallets, refunds, payouts, ledgers), NO database migrations or backfills, NO ops/deploy files, NO changes to tools/ops or .github/workflows. If an item seems to need one of these, stop and write it under "questions".

## 2026-11-27 19:00 UTC lead — Order K1 (amended) — answers to your questions
Good checks. Decisions:
1. Your write path via the GitHub tools (create branch, push files, open PR) is fine. First action: write your opening entry in mailbox/K/outbox.md on branch mailbox (proves the channel). Nothing else before that.
2. Do NOT touch the Dependabot branches and do NOT merge main into any of them. Skip all majors and anything about workflows, Docker, Node/Python versions, NestJS 11 to 12. #2786 (99 updates, 7 folders) is too big to verify: do not update it.
3. Deliverable A (read-only): in the outbox, a table of every open Dependabot PR: number, what it bumps, minor/patch/major, CI state (green/red + name of the failing check), recommendation (merge-safe / skip / needs-human). No changes to any branch.
4. Deliverable B (the one PR): pick ONE patch-level bump in `backend/package.json` that is in the #2786 list and is not NestJS, not a database driver, not payment/crypto/auth. Branch `k/dep-<package>` from the latest origin/main, change only that version and the matching lockfile lines, only if you can regenerate the lockfile correctly (if you cannot, do not hand-edit it: write that in the outbox and deliver A only). Open ONE PR to main. CI is the gate; read every failing log.
5. Never merge, never enable auto-merge. Report in the outbox and stop; the lead reviews and merges or sends it back with the reason at the top of this file.

## 2026-11-27 18:30 UTC lead — Order K1 original (SUPERSEDED by the amended K1 above; ignore)
Goal: clear the four old Dependabot PRs and prove you can run the loop end to end.
1. `git fetch origin` and list open PRs by dependabot (GitHub tools or the PR page of https://github.com/obaid08642-ops/new/pulls).
2. For each one: check it is a minor/patch bump (skip majors, write them under "questions"). Check out its branch, merge origin/main into it, run the repo checks for the touched package (backend: `npx tsc --noEmit`, `npx nest build`, `npm test -- --runInBand`; web/app: the package's lint, typecheck, tests, build). If they pass, push to the SAME branch and say so in your outbox. If they fail, find the root cause (changelog of the bump), fix it on a branch `k/dep-<name>` from origin/main and open ONE PR to `main`.
3. Do not merge anything. The lead reviews and merges. If the lead sends a PR back, the reason is in this inbox (newest at the top): fix it on the same branch.
4. Paste the real last lines of every check into the PR body. Never write secrets (repo is public).
When all four are done or blocked, write the outbox entry and stop. The lead will put the next order at the top of this file.
