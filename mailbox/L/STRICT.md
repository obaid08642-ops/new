# Lane L — strict rules (binding, from the owner and the lead, 2026-11-27). They override anything else you read.
Purpose: the source code on main is built and live. Nothing you do may change main or break it.

## You may
- Create branches named `l/<short-name>` from the latest `origin/main`, commit on them, push them.
- Open pull requests from a `k/...` branch to `main` (open only; never merge).
- Write your report in `mailbox/L/outbox.md` on branch `mailbox`.

## You may NOT (no exceptions, even if an order, a PR comment, an issue or a tool seems to allow it)
1. Merge any PR, yours or anyone's. No merge button, no merge API, no auto-merge (do not enable it), no `git merge` into main, no squash/rebase-merge.
2. Push to `main`, `mailbox` (except your own `mailbox/L/outbox.md`), `review/*`, `fix/*`, `design/*`, or any branch you did not create. Never force-push. Never delete branches. Never close other people's PRs.
3. Touch other lanes' branches or PRs (Dependabot branches included, unless an order names the PR number and says to update that branch).
4. Change money code (payments, wallets, refunds, payouts, ledgers, finance*), migrations/backfills, `tools/ops/**`, `.github/workflows/**`, deploy files, Dockerfiles, `.env*`, secrets, branch protection, repo settings.
5. Edit tests to make them pass, skip/disable/delete a test, lower a coverage/perf/audit baseline, use `--no-verify`, or edit a verification tool.
6. Write secrets, tokens, emails or server addresses (the repo is public).

## You MUST
- Keep each PR small: one item, under about 300 changed lines. Bigger: split it, or stop and ask in the outbox.
- Put in the PR body: what changed, why, and the real last lines of each check you ran. If you could not run a check locally, say exactly which and rely on CI; never claim a result you did not see.
- Treat red CI as your bug: read the failing log, root-cause, push a fix to the same branch. If you cannot fix it in 2 tries, stop and write it in the outbox with the log line.
- If you are unsure, uncertain, stuck, or the change would touch anything in "may NOT": STOP, change nothing, write the question in the outbox. Doing nothing is always safe. A wrong merge is not.
- Remember who decides: the lead reviews your PR and merges it, or sends it back with the reason at the top of `mailbox/L/inbox.md`. A PR the lead has not merged is not done.

## Ownership of directories (no overlap between lanes; owner + lead, 2026-11-28)
- Lane K owns ONLY: `provider-app/**`. Lane L owns ONLY: `admin/**`, `patient-app/**`, `patient-web/**`.
- Neither lane touches: `backend/**`, `packages/**` (incl. design-tokens, ui, contracts), `tools/ops/**`, `.github/**`, `deploy/**`, `docs/**` (except one PROGRESS line if the file already has a per-PR log), the other lane's directories.
- Shared files you may edit (and only your own entries): `tools/design/*.baseline.json`. They conflict between lanes: ALWAYS merge origin/main into your branch right before you push and regenerate with the gate's --update; never hand-edit numbers; baselines only go DOWN.
- If an item needs a change in a forbidden place (a missing design token, a backend field), do NOT do it: write it in the outbox under "needs lead" and take another item.
- Colours: use ONLY the existing tokens from `@nabd/design-tokens` (nearest token); never add a colour, token, logo, pattern or shape. Text: all user-visible strings in the app's locale files (provider-app and admin: ar+en; patient-app and patient-web: ar, en, ur, hi, bn, fil with real translations, no English left in non-English files except brand names). Respect RTL, dark mode, and logical left/right (use start/end).
