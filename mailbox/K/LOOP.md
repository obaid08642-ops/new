# Lane K — standing work loop (owner + lead, 2026-11-28). Never stop. Together with STRICT.md (STRICT wins on any conflict).

Every cycle (about every 30 minutes, and again right after you open or fix a PR):
1. `git fetch origin` (all branches incl. mailbox). Read the top of mailbox/K/inbox.md for new orders.
2. List YOUR open PRs (branches k/*). For each, read its check runs on GitHub:
   - RED: read the failing log, find the root cause, fix on the same branch, push. Two real tries, then write it in the outbox with the log line and move on.
   - CONFLICT (not mergeable): merge origin/main into the branch, regenerate generated files (e.g. the literal-string baseline with the gate's --update, never by hand), push.
   - GREEN and mergeable: leave it alone. The lead merges. Do NOT wait for it.
   - If the lead merged it or closed it, drop it from your list.
3. Before you open any NEW PR, self-review the diff as if you were the reviewer: only the files the item needs, no stray changes, no edited tests to pass, no skipped tests, no baseline raised, nothing from the forbidden list in STRICT.md, merges cleanly with the latest main, local checks run where you can and honestly reported where you cannot.
4. Then immediately take the NEXT item from the order list (K4 and later) on a new branch from the latest origin/main. Keep at most 3 PRs open. Never idle while items remain.
5. After each PR or fix, add one short entry at the top of mailbox/K/outbox.md (PR number, CI state, what changed, what is left).
6. If you are blocked or unsure: write the question in the outbox and continue with another item. Never stop the whole loop for a question.
7. If your context or usage limit is near: push everything, write your exact state in the outbox, stop.
Never: merge, enable auto-merge, push to main or other lanes' branches, touch money, tools/ops, workflows, migrations, secrets, or repo settings.
