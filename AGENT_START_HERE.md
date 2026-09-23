# START HERE — Instructions for the implementing agent

## Where everything is
- Repository: `https://github.com/obaid08642-ops/new`
- **Plan branch (read-only for you):** `plan/audit-2026-09`
  - `docs/audit/01_FINAL_AUDIT_REPORT.md` — every finding (F01–F81) with evidence (file:line).
  - `docs/audit/02_AGENT_EXECUTION_PLAN.md` — **what you must build, phase by phase.** This is your contract.
  - `tools/audit/` — verification scripts referenced by the plan's gates.
- **Your work branch:** create `fix/audit-2026-09` from the plan branch:
  ```
  git fetch origin
  git checkout -b fix/audit-2026-09 origin/plan/audit-2026-09
  ```
  Commit and push ONLY to `fix/audit-2026-09`. Never push to `main` or to `plan/audit-2026-09`.

## How to work
1. Read `02_AGENT_EXECUTION_PLAN.md` section 0 (rules) fully before coding.
2. Execute **one phase at a time**, in order (P0 → P11). Inside a phase, do tasks in the listed order.
3. For every task: implement exactly the "Do" → self-review your diff against the task → run "Verify" → fix until green → commit `[P<n>.<t>] <F-id> <summary>` → append a row to `AGENT_PROGRESS.md` (task | sha | verify result | notes).
4. At the end of each phase: run the phase **Gate**, paste the outputs into `AGENT_PROGRESS.md`, `git push origin fix/audit-2026-09`, then **STOP** and report: "Phase N complete, gate output attached, ready for review."
5. Wait for the review file `REVIEW_P<n>.md` (pushed to your branch by the reviewer). Fix every FAIL item it lists, re-run the gate, push, and only then start the next phase.

## Hard rules
- No mock data, placeholders, fake success responses, TODO stubs, skipped/deleted tests, `--no-verify`, or `any` in new DTOs.
- Do not change scope. If something in the plan is impossible or ambiguous, write `BLOCKED: <reason>` in `AGENT_PROGRESS.md` and continue with the next task.
- Use a real MongoDB 7 replica set for tests (`docker run -d -p 27017:27017 mongo:7 --replSet rs0` then `rs.initiate()`), plus Redis 7.
- Insurance: **no NPHIES or insurer integration.** Provider enters the approval decision manually (see plan Phase 8).
- Secrets come from env only. Never commit keys. Missing secret → BLOCKED.

## First message you should send back
"I have read AGENT_START_HERE.md and 02_AGENT_EXECUTION_PLAN.md. Starting Phase 0 on branch fix/audit-2026-09."
