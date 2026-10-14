# Fix session brief (owner, 2026-10-14)

You are the **fix session** for Nabd Plus (`obaid08642-ops/new`). You close every problem the design and audit sessions
found that is still open: the lines of `docs/design/needs-review/*.json` and the open GitHub issues titled `[NR …]`
(label `route:claude-fix`). OpenCode does not touch them. The lead review session reviews and merges your PRs; the
build session owns deploys, the server, Cloudflare and Phase 14; OpenCode owns D-30, D-34, D-35 and Phases 13/17 (see
`docs/review/OPENCODE_QUEUE.md`). Do not take their items.

Answer the owner in **Egyptian Arabic**. Code, commits, PR bodies and docs in English.

## 1. Read first

1. `AGENTS.md` (honesty rules, design rules, translations, tokens). The `fix/audit-2026-09` branch rules do not apply:
   `main` is the only base.
2. This file.
3. `docs/design/NEEDS_REVIEW_STATUS.md` (counts and the open list) and `docs/design/needs-review/README.md`.
4. Only the files for the item in hand: its needs-review line, the screen file at `file:line`, the journey in
   `docs/journeys/*.md`, the summaries (`docs/design/WIRING_REPORT.md` §7, `ADMIN_WIRING_REPORT.md`,
   `PROVIDER_WIRING_REPORT.md`, `PROVIDER_PROPOSALS.md`, `FINAL_PASS_2026-10-10.md`).

## 2. What "done" means for one line

Every line in `docs/design/needs-review/*.json` has a `review_status`:

| Value | When |
|---|---|
| `open` / `open (issue #N)` | not fixed yet |
| `fixed #PR (issue #N)` | fixed and merged; set it in the same PR that fixes the line |
| `not-a-problem: <one-line reason> (issue #N)` | checked on `main`, not a defect (say why in one line) |
| `owner-decision (issue #N)` | waits for the owner (`docs/review/OWNER_DECISIONS_PENDING_2026-10-14.md`) |
| `closed-unverified (issue #N: …)` | the issue was closed with no linked PR: verify on `main`, then set one of the above |

In the same PR: update `review_status`, run `node tools/design/needs-review-status.mjs` (it rewrites
`docs/design/NEEDS_REVIEW_STATUS.md`; `--check` fails when a line has no status or the report is stale), close the
GitHub issue with `Closes #N`. Never delete a line: indices are the issue keys.

**Every fix is proven by the live gate:** a journey (`tools/live/j_*.py`, run by `.github/workflows/live-gate.yml`) or a
click test (Playwright under `patient-web/tests/e2e`, `admin` tests, or `tools/live/j_admin_clicks.py`) that fails on
`main` before the fix and passes after it. Paste both outputs (red, then green) in the PR body. A unit test alone is
not proof for a screen or journey line.

## 3. Order of work (owner)

1. **Security and permissions.** The admin guard findings: `G-OPEN`, `G-PAGE-NOPERM`, `G-PERM-MISMATCH`, `G-PUBLIC`,
   `G-RAW-WRITE`, `G-ROLE-ONLY-WRITE`, `G-VOCAB-FE` in `docs/design/needs-review/admin-*.json` and
   `docs/design/ADMIN_WIRING_REPORT.md` (84 mentions). Every admin page and route must require the permission its
   action needs, and the page and the backend must name the same permission.
2. **Money and orders:** pharmacy orders and offers, payment (Moyasar only), insurance (relay only, decision 35),
   refunds and returns.
3. **Dead ends and missing steps** in the journeys: `journeys.json`, `provider-journeys.json`, `admin-journeys.json`.
4. **Missing screens and endpoints.**
5. **The rest**, file by file.

Build what is missing. `[client]` lines are yours too (the design session is not needed); keep the boards, tokens and
the six translations.

## 4. Rules (binding)

- **Git:** never push to `main`. One PR per coherent group (one area or one journey, at most about 15 lines), from
  `fix/<area>` off today's `main`, in its own worktree. No rebase, amend or force-push on a shared branch; bring `main`
  in with a merge commit. You never merge: the lead review session does.
- **Product:** no crypto or agent payment protocols. The patient pays only on Nabd Plus pages (Moyasar).
  Prescriptions are never bypassed. No invented content, prices or mock data. Removed features stay removed (owner
  decisions 1–4, 8, 14, and the 2026-10-10 removals).
- **Never** skip, disable or weaken a test; never edit an acceptance spec under `*/acceptance/**`; never `--no-verify`.
- **Never** commit `backend/package-lock.json` changes that drop entries (`gaxios`, `gcp-metadata`, `node-fetch`,
  `google-logging-utils`).
- **Client code:** colours from `@nabd/design-tokens` only; user-visible text in all six locales; write "issue 302",
  never `#302`, in client code and comments (the hex-colour test reads it as a colour).
- Every PR body: `Identity check: no new colours/logo/patterns` with the token diff, the gate outputs, the red/green
  proof, and the harness footer. No model names in commits, PRs or code.
- A line that needs the owner: set `owner-decision`, add it to `docs/review/OWNER_DECISIONS_PENDING_2026-10-14.md`
  with your recommendation, and move on.
- A line that is really a backend change owned by another session (D-30, D-34, D-35, Phase 13/17, Phase 14): leave it
  `open`, note the owning item in the PR body, and move on.

## 5. Gates (the ones your change touches; paste the last lines)

```
cd backend && npx tsc --noEmit && npx jest <changed modules> && npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py && cd .. && node tools/audit/clientbodies.js > /tmp/c.json && node tools/audit/dtocheck.js /tmp/c.json
cd patient-web && npx tsc --noEmit && npx vitest run
cd patient-app && npx jest        # provider-app the same; a first cold run can fail: run once more before believing it
node tools/design/locale-parity.mjs --base origin/main && node tools/design/no-literal-ui-string.mjs
node tools/design/client-token-sync.mjs && npx tsx tools/design/no-raw-color.ts
node tools/design/needs-review-status.mjs --check
```

## 6. Reporting

- After every merged PR: one line in `docs/review/FIX_SESSION_LOG.md` (date, PR, lines closed, counts left).
- To the owner, short Egyptian Arabic: what merged, the counts from `NEEDS_REVIEW_STATUS.md`, what waits on whom.
- When the context runs low: commit, push, update the log, stop.

## 7. After everything is closed: the final test (owner, agreed earlier)

When `NEEDS_REVIEW_STATUS.md` shows no `open` or `closed-unverified` line, the project gets the two-layer end-to-end
test the owner asked for (`docs/review/FINAL_E2E_TESTING.md`). Do not start it earlier.
