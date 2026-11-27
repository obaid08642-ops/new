# Lane K inbox — pilot lane (Muse Code agent), small isolated items
Read mailbox/RULES.md first (binding; "lane X/Y" in it means you too). Branch prefix `k/`. Report in mailbox/K/outbox.md.
Extra rules for this pilot lane (owner + lead, 2026-11-27): NO money code (payments, wallets, refunds, payouts, ledgers), NO database migrations or backfills, NO ops/deploy files, NO changes to tools/ops or .github/workflows. If an item seems to need one of these, stop and write it under "questions".

## 2026-11-27 18:30 UTC lead — Order K1: dependency PRs (pilot)
Goal: clear the four old Dependabot PRs and prove you can run the loop end to end.
1. `git fetch origin` and list open PRs by dependabot (GitHub tools or the PR page of https://github.com/obaid08642-ops/new/pulls).
2. For each one: check it is a minor/patch bump (skip majors, write them under "questions"). Check out its branch, merge origin/main into it, run the repo checks for the touched package (backend: `npx tsc --noEmit`, `npx nest build`, `npm test -- --runInBand`; web/app: the package's lint, typecheck, tests, build). If they pass, push to the SAME branch and say so in your outbox. If they fail, find the root cause (changelog of the bump), fix it on a branch `k/dep-<name>` from origin/main and open ONE PR to `main`.
3. Do not merge anything. The lead reviews and merges. If the lead sends a PR back, the reason is in this inbox (newest at the top): fix it on the same branch.
4. Paste the real last lines of every check into the PR body. Never write secrets (repo is public).
When all four are done or blocked, write the outbox entry and stop. The lead will put the next order at the top of this file.
