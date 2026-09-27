# AGENTS.md — Rules for the implementing agent (Nabd Plus)

Read this file fully at the start of EVERY session. These rules override any default behavior.

## Your role
You IMPLEMENT the plan. A separate reviewer reviews and merges your work. You never merge.

## Sources of truth (read before coding)
- `docs/audit/02_AGENT_EXECUTION_PLAN.md` — the contract. Do exactly what each task's "Do" says; prove it with its "Verify".
- `docs/audit/01_FINAL_AUDIT_REPORT.md` — the findings (F-ids) with evidence.
- `REVIEW_P*.md` — reviewer verdicts. Every FAIL item in the latest review is mandatory before anything else.
- `AGENT_PROGRESS.md` — your log.

## Branch rules
- Work ONLY on `fix/audit-2026-09`. Never push to `main`. Never force-push.
- Start every session with: `git fetch origin && git checkout fix/audit-2026-09 && git pull --ff-only origin fix/audit-2026-09`
- Never revert code from `[REVIEW-*]` commits.

## Scope rules
- One phase at a time. Do NOT start the next phase until the reviewer has APPROVED the current one (a REVIEW_P<n>.md with verdict APPROVED on main).
- One task = one commit: `[P<n>.<t>] <F-id> <summary>`.
- Never defer, skip, or partially complete a task or a review FAIL item. "Deferred", "remaining", "secondary", or "safe to postpone" are NOT allowed.
- If something is truly impossible, write `BLOCKED: <exact reason>` in AGENT_PROGRESS.md and STOP. Do not work around it.
- Do not change anything outside the task's scope.

## Honesty rules (no hallucination)
- Never claim a result you did not see. Paste the REAL terminal output (last lines) of every Verify command into AGENT_PROGRESS.md.
- Making a checker pass is not the goal; the behavior is. Do not edit a verification tool to make it pass unless the reviewer approved the change.
- No mock data, placeholders, TODO stubs, fake success responses, skipped/deleted tests, `--no-verify`, or `any` in new code.
- Before editing a file, read it. Do not invent functions, fields, or endpoints; grep to confirm that they exist.

## DTO rules (Phase 3 and later)
- Every DTO field has a real validator: @IsString/@IsNumber/@IsInt/@IsBoolean/@IsIn/@IsEnum/@IsArray/@ValidateNested/@IsDateString, plus @IsOptional only where the field is truly optional.
- Free-form JSON only with @IsObject (or @Allow) plus a comment `// free-form: <reason>`.
- Field names must match what the clients (patient-app, patient-web, provider-app, admin) actually send.

## Gate before every push (all must pass; paste the outputs)
```
cd backend
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py            # exit 0
node ../tools/audit/clientbodies.js > /tmp/c.json && node ../tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
```
If a gate fails, fix it. Never push red.

## When done
Push `fix/audit-2026-09`, then report exactly:
"Phase <n> complete (or: Review round <r> fixes done), ready for review. Tip: <sha>. Gate outputs are in AGENT_PROGRESS.md."
Then STOP and wait.
