# Per-commit review brief (owner requirement: check everything, trust nothing the agent wrote)

Code under review: agent branch `fix/audit-2026-09` at `bb97c87` (152 commits not in `main`).
Never trust a commit message or `AGENT_PROGRESS.md`. Any claim you cannot prove counts as FALSE.

## Your workspace
- Your OWN worktree (detached at bb97c87) is given in your task. You may edit files there ONLY to
  mutation-test (break code on purpose), and you MUST `git -C <wt> checkout -- .` afterwards. Never commit, never push.
- `backend/node_modules` and `admin/node_modules` are symlinks: do NOT run npm install / npm ci in them.
- Read-only shared tree: `/home/user/agent-tip` (do NOT edit it; the live backend runs from its `backend/dist`).
- Shared LIVE stack (do NOT restart or kill it, do NOT run start-backend.sh, do NOT drop databases):
  backend `http://127.0.0.1:8002/api/v1` (DB `nabd_live` in docker container `mongo`, replica set),
  admin BFF `http://127.0.0.1:3001`, SMTP sink :2525 (mail in /tmp/nabd-mail.jsonl), fake Moyasar :9100, S3 moto :9000, Redis :6379.
  Admin login + helpers: `tools/live/lib.py` (see how `tools/live/j_*.py` use it; ADMIN_GATE_TOKEN=live-gate-token,
  NABD_ADMIN_DEVICE=live-gate-owner-macbook-01). Run journeys from `/home/user/agent-tip/tools/live` with
  `python3 j_<name>.py`. Synthetic test data only. You may read Mongo with
  `docker exec mongo mongosh --quiet nabd_live --eval '...'` (reads only).
- The reviewer already ran the full gate on bb97c87: tsc 0, nest build OK, unit 1 failed
  (`src/modules/events/auto-entity-seo-pipeline.spec.ts` Scenario 20, sitemap), boot suites 65/65, dtolint 0, dtocheck 0.
  PR #237 CI (new vs main): patient-web `tests/translation-key-parity.test.ts` fails (Errors.* keys), `npx expo install --check`
  fails in patient-app and provider-app jobs (step added by bece53a), CodeQL 7 new High (step-up.guard.ts:91,
  admin-notification-center.module.ts:456, ai-gateway.service.ts:144/160, payments.module.ts:324/353/364).
  Native strict run: provider-app `npm ci` fails (lock out of sync; Q58).
  Live gate so far: j_accounts 42/42; j_onboarding 143/149 — approval of home_care, hospital, ambulance fails 400
  `required_documents_missing` (find which commit and whether the provider-app registration screens actually upload those typed docs).

## The nine checks, per commit (all nine must hold to PASS)
1. Read the WHOLE diff line by line (`git show <sha>`), not the message.
2. Message vs diff vs plan: does the code fully do what the message AND the task's "Do"/"Verify" say
   (`docs/audit/02_AGENT_EXECUTION_PLAN.md`, `REVIEW_REAUDIT_P1_P11.md`, `docs/review/QA_DEFECTS.md`)? List what is claimed but missing,
   and anything changed that the task did not ask for.
3. Wiring: grep every new export/class/route/component for real callers (route, screen, job, module import). Uncalled = NOT done.
   Check also that the code still exists at the tip (a later commit may have removed/replaced it).
4. Tests: do they assert real behaviour (not mocks of the unit under test, not `expect(true)`)? Run them. Then break the code
   on purpose once in your worktree (e.g. invert a condition, remove the guard) and confirm the test FAILS; restore.
   No test for a behaviour change = fail of check 4.
5. Live proof: exercise the behaviour on the live stack (curl / python / journey) and paste the real output (short). If it cannot be
   exercised locally (native-only, needs staging/external service), say exactly why — that check is then "NOT PROVEN", not pass.
6. Regressions: run the specs/journeys touched by the changed files; note any failure and compare with the reviewer's gate above.
7. Hygiene: no mock/fake data, fallbacks, hard-coded catalog lists, `any` in new code, TODO/"deferred", skipped tests, secrets,
   debug leftovers, or a second copy of an existing function.
8. Security/data: auth guard + roles/permissions on every new route, DTO validators on every field, ownership/IDOR checks,
   no PII in logs, no public cache of private data, step-up where required (Q66).
9. Every AGENT_PROGRESS.md claim for this commit (grep the sha / task id) that you cannot reproduce = FALSE, report it.

## Output (mandatory)
Write your rows to the file given in your task, markdown, one row per sha, exactly these columns:
`| sha | task | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | verdict | evidence (file:line, command + real output) | agent must do |`
Cells 1–9: `ok`, `FAIL`, or `n/p` (not provable locally — with the reason in evidence). verdict: PASS only if all nine are ok;
otherwise FAIL (or NOT PROVEN if the only gaps are n/p). Be concrete: file:line, the command you ran and its real output.
After the table add "## Serious findings" (ranked) and "## Not tested and why".
Return to the reviewer a short summary (counts PASS/FAIL/NOT PROVEN + top 5 findings).
