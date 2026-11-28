# Lane K inbox — pilot lane (Muse Code agent), small isolated items
Read mailbox/K/STRICT.md FIRST (binding, overrides everything else), then mailbox/RULES.md (binding; "lane X/Y" in it means you too). Branch prefix `k/`. Report in mailbox/K/outbox.md.
Extra rules for this pilot lane (owner + lead, 2026-11-27): NO money code (payments, wallets, refunds, payouts, ledgers), NO database migrations or backfills, NO ops/deploy files, NO changes to tools/ops or .github/workflows. If an item seems to need one of these, stop and write it under "questions".

## 2026-11-28 11:20 UTC lead — Standing order: follow mailbox/K/LOOP.md every cycle
New file mailbox/K/LOOP.md = your permanent loop (self-review before PRs, fix your own red/conflict PRs every cycle, never wait for my merge, never stop). The K4 item list stays valid.

## 2026-11-28 11:00 UTC lead — #2805 merged. #2806 and #2807 reviewed, CI green, but CONFLICT (baseline json) after #2805
Do now: for #2806 then #2807: merge origin/main into the same branch, regenerate the baseline with the gate's --update (do not hand-edit numbers), push, wait for green. I merge in order; each merge may conflict the next one the same way, so keep them rebased on main. To avoid this in future, make batches independent in files except the baseline and always re-merge main right before you push.
Review notes (not blocking): (1) `// i18n-ok:` is accepted only where the reason is real (the CSV column header line in #2807 is fine); never use it to hide a user-visible sentence. (2) In #2807 `' · ${stock.price} ${AR ? 'ر.س' : 'SAR'}'` was only moved to a variable; that is still a hard-coded currency literal (and Saudi-only). It lowers the number without fixing it. Next time: take the currency from the market config or an existing currency formatter/key, or leave it in the baseline and list it in the outbox. (3) Keep going down the K4 list without waiting.

## 2026-11-28 05:30 UTC lead — #2804 merged. Order K4 (BIG queue; do NOT wait for merges between items)
Reviewed K1-K3: clean, correct, honest. Change of process because waiting for my merge idles you for hours: I only look every few hours, so work through this whole list without stopping.
Rules of the loop:
- Batch: one PR = up to ~300 changed lines = several screens/files of the same kind. Start the NEXT batch right away on a new branch from the latest origin/main, even if the previous PR is not merged yet. If a later PR conflicts (the baseline json `tools/design/no-literal-ui-string.baseline.json` is the usual one), merge origin/main into your branch, run the gate with --update, push.
- Keep at most 3 PRs open at once. If 3 are open and CI-green waiting for me, fix any red one, then pick items that do not touch the same files.
- Red CI on your PR: read the log, fix on the same branch (2 tries, then write it in the outbox and move on to the next item).
- Report once per PR in mailbox/K/outbox.md, then continue. Never end your turn while the list below has unfinished items.
Items (in order; skip an item and note why if it touches money, ops, workflows or migrations):
 1. provider-app: next screens from the literal baseline by count of real user-visible strings (LabDashboard, FacilityRegistration, then everything else ranked). ar+en keys. Baseline only goes down; state old -> new in each PR body. Goal: baseline 0 for provider-app, or list in the outbox the strings you cannot move and why.
 2. admin app (admin/): same literal-string work if the same gate/locales exist there (check `tools/design` for its baseline); otherwise skip and say so.
 3. Test debt: for each file you changed in 1-2 that has no test, add a small unit test only if the repo already tests screens of that kind; do not invent a new test setup.
 4. Dependabot: for each open minor/patch Dependabot PR other than #2786 (there are none right now; re-check), do the K1 procedure.
 5. Docs: `docs/design/PROGRESS.md` stays under 8 KB; add one line per merged batch only if the file already has a per-PR log; otherwise skip.
Never: merge, enable auto-merge, touch money code, tools/ops, workflows, migrations, secrets, or other lanes' branches.

## 2026-11-28 00:30 UTC lead — K2 merged (#2801); Order K3 (queued)
Good catch on the language scope: you are right, the provider app is ar+en only (owner decision 2026-10-31); my K2 text saying six languages was wrong for this app. Rule from now on: provider-app = ar and en; patient-app and patient-web = six languages.
One correction: 11 of the 13 "literals" you cleared were state-code comparisons (`state === 'CONFIRMED'`) that you hoisted into booleans. That is behaviour-neutral and fine, but it lowers the number without removing any user-visible text. In K3 go for REAL display text first (labels, placeholders, toasts, errors, aria-labels, alt text).
K3: same loop as K2, next provider-app screen group from the baseline, ranked by count of real user-visible strings (skip files that are mostly state codes). One screen or one small group per PR, under 300 changed lines, ar+en keys, baseline lowered by exactly what you removed, report "old -> new". Still no money screens (payments, wallets, payouts, invoices), no tools/ops, no workflows. Repeat K3-style items on your own from the baseline until the lead says stop; after each merged PR, take the next one. Never merge.

## 2026-11-27 21:35 UTC lead — Order K2 (queued; start only after PR #2800 CI is settled and reported)
Good work on K1: clean diff, right checks, honest report. Answer to your question: leave the four green majors alone; the lead decides.
K2 = first real-work slice, provider-app UI text (translation rule in AGENTS.md: no user-visible literal in a screen; all strings from provider-app locale files in six languages ar, en, ur, hi, bn, fil; no fallback; the CI gate `no-literal-ui-string` is a ratchet that may only go DOWN).
1. Find the provider-app locale files and the literal-string baseline (grep the repo for `no-literal-ui-string`).
2. Pick ONE screen (smallest with the most literals), branch `k/provider-literals-<screen>` from latest origin/main. Move its literals into the locale files with real translations in all six languages (not English copies; brand names may stay). Keep layout, tokens and logic unchanged.
3. Lower the baseline by exactly the number you removed and state "literal baseline old -> new" in the PR body. Under 300 changed lines.
4. CI is the gate; no merging. Report in the outbox. One slice per PR; the next order comes from the lead.
If any translation is uncertain, keep your best attempt and list the doubtful strings in the PR body for the lead.

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
