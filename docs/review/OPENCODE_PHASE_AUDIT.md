# OpenCode phase audit: phases 13–22 (owner, 2026-10-06)

**Who:** the OpenCode session that built phases 13–22. The Queue A/C session uses `OPENCODE_QUEUE.md` instead.

**Goal:** before the reviewer reads the ~450 commits on `fix/audit-2026-09`, OpenCode audits its own work:
- against the **amended** plan;
- against the reviewer's earlier FAIL lists;
- against `main` (with a trial merge only).

It fixes what is broken, completes what is missing, and takes out what the owner removed, so that the reviewer's independent review finds as little as possible. **Your statuses are not trusted.** The reviewer re-checks everything. Every claim needs evidence that the reviewer can re-run.

## 1. Branch and git rules (binding)

- **Work only on `oc/phase-audit`.** It already exists: the tip of `fix/audit-2026-09` (`a0df24b3`) plus the reviewer's P15–P21 report and acceptance tests.
  ```
  git fetch origin
  git checkout -B oc/phase-audit origin/oc/phase-audit
  ```
- **Push only that branch:** `git push origin oc/phase-audit`.
  - Never force-push.
  - Never rebase or amend a pushed commit.
  - Never push to `main`, `fix/audit-2026-09` or any other branch. Never create new branches on the remote.
  - Never merge anything into `main` or `fix/audit-2026-09`.
- **One draft PR,** `oc/phase-audit` → `main`, titled `[OC phase-audit] DO NOT MERGE`, only so that CI runs on every push. Never mark it ready and never merge it.
- **One commit per plan task fixed:** `[AUDIT <task-id>] <summary>`, for example `[AUDIT 13.R5] error catalog: wire the patient-web client`.
- **Never touch:**
  - code from `[REVIEW-*]` commits (103 of them on this branch);
  - acceptance files (`*/acceptance/**`);
  - CI workflows (`.github/**`);
  - checkers (`tools/audit/*`, `tools/design/*`).
  If one looks wrong, write it in the report and move on.
- **Tests:**
  - Never delete, skip or weaken a test. Never edit a test so it passes.
  - The only exception: a test of something the owner removed (§3) that this branch added. List each such test in the report.
- **Never invent** SHAs, action versions, endpoints, fields, numbers or results. Grep before you use a name. Paste real command output only.

## 2. Inputs (read in this order)

1. **The amended plan:** `git show origin/main:docs/audit/02_AGENT_EXECUTION_PLAN.md`. Read "PLAN AMENDMENTS" first, then phases 13–22. Phase 13 details are in `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` Part B.
2. **The owner decisions:** `git show origin/main:docs/product/OWNER_DECISIONS_2026-10-06.md`.
3. **The reviewer's FAIL lists, which are mandatory work:**
   - `REVIEW_P13.md` and `REVIEW_P14.md`: rows marked FAIL or "back to the agent";
   - `docs/review/REVIEW_OPENCODE_P15_P21.md`: 38 FAIL commits, a broken tip, and the regressions in phases 3 and 5;
   - the acceptance tests `backend/acceptance/oc-auth`, `oc-phase21`, `oc-security`, `oc-migrations` and `oc-ci`. These must pass: `cd backend && node scripts/run-acceptance.mjs <id>`.
4. **The commits to audit:**
   ```
   git log --reverse --no-merges --format='%h %s' origin/main..origin/oc/phase-audit
   ```
   Skip the `[REVIEW-*]` commits; they are the reviewer's.

## 3. What the owner removed

These features are removed (see the plan amendments):
- community posts;
- the leaderboard;
- family calls;
- skin analysis;
- the whole ambulance system;
- mental-health scoring and crisis handling;
- purchase challenges.

What you do about them:
- On this branch, take out only what **phase commits added** to those features, or any phase code that depends on them.
- **Do not delete code that already exists on `main`.** That removal is done once, on `main`, by the other session (Queue C). If a phase task depends on a removed feature, mark it CHANGED and remove the dependency.

## 4. Method, phase by phase (13, then 14, …, then 22)

### Step 1: map

For each plan task in the phase, find the commits that implement it.
- Commit messages are unreliable, so read the diff.
- A commit that matches no task is `UNMAPPED`: describe it in one line. Do not delete it; the reviewer decides.

### Step 2: check each task with the reviewer's nine points

1. **Diff vs plan:** does the code do everything the task's "Do" says, as amended? List what is missing and what is extra.
2. **Wiring:** is every new export called from a real route, screen or job? Grep for the callers. Code that nothing calls is not done.
3. **Tests:**
   - They assert real behaviour, not mocks of the code under test.
   - Run them, then break the code once to see them fail; revert that break.
4. **Verify:** run the task's Verify line and paste the real output.
5. **Regressions:** run the gate (§6) and compare with the previous phase.
6. **Hygiene:** no mock data, fallbacks, hard-coded lists, `any`, TODO, skipped tests, secrets or debug leftovers, and no second copy of an existing function.
7. **Security:**
   - authorization on every new route;
   - DTO validators (AGENTS.md DTO rules);
   - no PII in logs;
   - no public cache of private data;
   - no destructive migration (drop, delete of real data) without an archive step.
8. **Owner decisions:** nothing that the decisions remove or forbid. Rx rules, AI limits and price ceiling as amended.
9. **Clients:** request bodies match the DTOs (`clientbodies` / `dtocheck`, 0 mismatches).

### Step 3: fix

- **Fix** what fails, in that task's commit (`[AUDIT <id>]`).
- **Complete** what is PARTIAL.
- **Build** what is MISSING, for phases 13–22 only. Phase 23 is out of scope.
- **Take out** what the owner removed, as in §3.
- **When the plan does not say how,** do not decide yourself. Write `QUESTION <task-id>: <the exact choice>` in the report and move on to the next task.

### Step 4: trial merge with `main`

Do this at the end of every phase. It is a **trial only**, never pushed:
```
git fetch origin
git switch -c tmp/trial-merge oc/phase-audit
git merge --no-ff --no-commit origin/main      # note every conflicted file
# if it merged without conflicts: run the gate (§6) on this tree and note every failure
git merge --abort 2>/dev/null; git switch oc/phase-audit; git branch -D tmp/trial-merge
```

Then, on `oc/phase-audit`:
- **Fix the causes that are on your side.** Examples: your code calls a function that `main` renamed, or uses a field that `main` changed.
- **Never copy `main`'s files over yours to make the conflicts go away.**
- **Record each conflicted file** in the report: the file, both sides in one line each, and the proposed resolution. `main` wins for every `[REVIEW-*]`, design or security change unless the plan says otherwise.

### Step 5: report and push

- Update `docs/review/phase-audit/INVENTORY.md` (§5).
- Run the gate (§6).
- Push.
- Send the owner: the phase number, the tip SHA, the counts (DONE / PARTIAL / MISSING / REMOVED / QUESTION) and the gate result.

## 5. The report: `docs/review/phase-audit/INVENTORY.md`

**One table per phase,** with one row per plan task:

| Task | Status | Commits | Evidence | Fixed in |
|---|---|---|---|---|

- **Status:** `DONE`, `PARTIAL`, `MISSING`, `CHANGED-BY-OWNER`, `REMOVED-BY-OWNER`, `NOT-NOW`, `BLOCKED: <reason>` or `QUESTION`.
- **Evidence:** `file:line` of the wiring, the test name, and the command with the last lines of its real output.
- **Fixed in:** the `[AUDIT]` commit SHA.

**Then:**
- the `UNMAPPED` commits;
- the trial-merge conflicts (§4 step 4);
- the reviewer FAIL items from §2.3, each with its fix SHA or `BLOCKED`;
- the open `QUESTION`s.

## 6. Gate (paste the last lines of each in the report, every phase)

```
cd backend
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py
node ../tools/audit/clientbodies.js > /tmp/c.json && node ../tools/audit/dtocheck.js /tmp/c.json
node scripts/run-acceptance.mjs --done
for id in oc-auth oc-phase21 oc-security oc-migrations oc-ci; do node scripts/run-acceptance.mjs $id; done
```

Run `tsc --noEmit` in `patient-web`, `admin`, `provider-app` and `patient-app` as well. The P15–P21 report found all four broken.

**Stop rule:** never start the next phase while the gate is red. Fix it, or write `BLOCKED` with the exact reason.

## 7. Done when

- Every task in phases 13–22 has a row with evidence.
- Every reviewer FAIL item has a fix or `BLOCKED`.
- The five `oc-*` acceptance suites pass and the gate is green.
- The last trial merge with `main` is recorded.

Then send:
> Phase audit complete. Tip `<sha>`. Report: `docs/review/phase-audit/INVENTORY.md`.

Then stop. The reviewer reviews, and only the reviewer merges.
