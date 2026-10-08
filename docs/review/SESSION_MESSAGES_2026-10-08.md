# Session messages (lead reviewer, 2026-10-08)

The owner sends each block below to one session. If your context is reset, re-read your block here on `origin/main`. Where this file and an older document disagree, this file wins.

---

## Rules for every OpenCode session (A, B and F)

These are the owner's rules. Breaking one means the reviewer throws the work away.

### 1. Git

1. **Push only your own branch** (named in your block), after every finished task: `git push origin <your-branch>`.
   - Never push to `main`, `fix/audit-2026-09`, `oc/phase-audit`, or another session's branch.
   - Create no other branch on GitHub.
2. **One pull request per branch, opened once, as a draft,** with the title given in your block.
   - Never mark it ready.
   - Never merge any pull request, yours or anyone else's.
   - Open no other pull request.
   - Never open a pull request into `fix/audit-2026-09`. That branch is frozen.
3. **History:**
   - Never `push --force`, `rebase`, `reset --hard` on a pushed commit, or `commit --amend` on a pushed commit.
   - Fix a mistake with a new commit.
4. **Bringing in other work:** only `git merge origin/<base>`, and only when the reviewer tells the owner to tell you.
   - **Resolve every conflict hunk by hand.**
   - **Never run `git checkout <ref> -- <file>` or `git restore --source`.**
   - **Never "restore files from version X".**
   - **Never take a whole file from one side** (`--ours`/`--theirs`) for code.

   This is exactly what broke `oc/phase-audit` on 2026-10-08: a "merge-fix" put 443 files back to an old version. It undid Phase 15 and the sign-in security fixes.
5. **After any merge, check what you deleted:**
   - Run `git diff --stat HEAD^1 HEAD` and `git diff HEAD^1 HEAD | grep '^-' | wc -l`.
   - Explain in your report every file where the merge removed lines that the other side had added.
6. **Commits:**
   - One commit per task: `[AUDIT <task-id>] <summary>` (Queue items: `[OC <item-id>] <summary>`).
   - No `--no-verify`.
7. **Cherry-pick** only with `-x`, and only commits named in your block.

### 2. Files you must never edit

`docs/review/**`, `docs/product/**`, `docs/design/**`, `AGENTS.md`, `.github/**`, `tools/audit/**`, `tools/design/**`, `*/acceptance/**`, and the code of `[REVIEW-*]` commits.

If one of them looks wrong, write it in your report and move on. Your own report goes only in the file named in your block.

The commit "[OC Queue C] Add OPENCODE_QUEUE.md tracker" on `oc/phase-audit` broke this rule. Do not repeat it.

### 3. Product rules (owner, binding)

**Removed features** (do not build them; take out only what the phase commits added):
- community posts;
- the leaderboard;
- family calls;
- skin analysis;
- the whole ambulance system;
- mental-health scoring and crisis handling;
- purchase challenges.

**Decisions:** everything in `docs/product/OWNER_DECISIONS_2026-10-06.md` (1–37). The new ones:
- **35:** insurance is relay-only. The provider gets the approval in its own systems. Nabd+ never calls an insurer or NPHIES.
- **36:** the legal texts are read from `legal_policies`.
- **37:** a marketplace of licensed facilities only.

**Code rules:**
- No mock data, fallbacks to invented values, hard-coded lists, `any`, TODO, skipped or weakened tests, secrets, debug leftovers, or PII in logs.
- Every DTO field has a real validator.
- **UI text:** every user-visible string comes from the locale files, in all six languages (ar, en, ur, hi, bn, fil).
- **Colours:** only `@nabd/design-tokens`.
- **Owner checks:** every new route checks authorization and ownership.

### 4. Evidence

- Statuses are not trusted. The reviewer re-runs everything.
- Paste the real last lines of every command you claim. Never invent SHAs, endpoints, fields or numbers. Grep before you use a name.
- If something is impossible, write `BLOCKED: <exact reason>` and move on.
- If the plan does not say how, write `QUESTION <id>: <the exact choice>` and move on.

### 5. Gate (run before every push; paste the last lines in your report)

```
cd backend
npm ci --no-audit --no-fund          # must pass WITHOUT --legacy-peer-deps once F-1 is merged
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py
node ../tools/audit/clientbodies.js > /tmp/c.json && node ../tools/audit/dtocheck.js /tmp/c.json
for id in oc-auth oc-phase21 oc-security oc-migrations oc-ci; do node scripts/run-acceptance.mjs $id; done
```

Also run `npx tsc --noEmit` in `patient-web`, `admin`, `provider-app` and `patient-app`.

- **Never push red code you caused.** If the gate is red only because of something F owns (§F Part 1), say so in the report and continue.

### 6. Before you start

1. Push any work you have not pushed yet.
2. Run `git fetch origin`.
3. Read `docs/review/phase-review/TIP_a2de0b44.md` and the `P<n>.md` files for your phases on `origin/main`. These are the reviewer's nine-point results; every FAIL / PARTIAL / MISSING row is your work list.

### 7. When done

Push, then send the owner exactly:

> `<session> done. Branch <branch>, tip <sha>. Report <file>. Counts DONE/PARTIAL/MISSING/BLOCKED/QUESTION = a/b/c/d/e. Gate: <green or the exact red lines>.`

Then stop.

---

## Message A: OpenCode session for Phases 15, 22 and 23

```
Read docs/review/SESSION_MESSAGES_2026-10-08.md on origin/main: "Rules for every OpenCode session" and "Message A". They override older instructions where they differ.

You are session A: Phases 15, 22 and 23.

Branch: oc/pa-15-22-23, created from origin/oc/phase-audit:
  git fetch origin && git checkout -b oc/pa-15-22-23 origin/oc/phase-audit && git push -u origin oc/pa-15-22-23
Push only this branch. Open one draft PR oc/pa-15-22-23 -> oc/phase-audit titled "[OC P15/P22/P23] DO NOT MERGE". Never merge it.
Report file: docs/review/phase-audit/SESSION_A.md (one table per phase: Task | Status | Commits | Evidence | Fixed in).

Order:
1. Phase 15 first. The merges of r12/p22-* into oc/phase-audit put old versions back and undid most of Phase 15 (TIP_a2de0b44.md, "The most important fact"):
   - the resilient clients in all four apps;
   - the breakers on mail, AI, LiveKit, WhatsApp, S3, Stripe and Tap;
   - the kill-switch consumers and seeding;
   - the merged idempotency protocol;
   - the NaN guards;
   - the Riyadh/Ramadan schedule code;
   - the app-root error boundaries and DeviceGate mounting;
   - the chaos journeys in the gate scripts.
   For each one: find the commit that added it (git log -S / git log --all -- <file>) and the merge that removed it, then re-apply those hunks BY HAND in a new [AUDIT 15.x] commit. Do not check out old files.
   You also own 14.4 (idempotency) and 14.18 (kill switches), because they are the same code. Session B skips them.
   Done when: the 37 tsc errors in the Phase 15 specs are gone, and those specs pass and fail when the code is broken once.
2. Phase 22: every row of docs/review/phase-review/P22.md (16 tasks, 0 pass). Rows marked CHANGED follow the owner's amended scope; removed features are not built.
3. Phase 23: the work is in r12/p23-audit-core, r12/p23-audit-admin and r12/p23-audit-apps (PRs #715-#717, which the reviewer closes).
   Do NOT merge those branches; they are based on the frozen fix/audit-2026-09.
   Cherry-pick their commits with -x onto your branch, then fix every row of docs/review/phase-review/P23.md (6 MISSING, 1 FAIL).
   23.3: the audit trail must be tamper-evident (hash chain) and stored apart from app data.

Do not touch what session F owns (F Part 1: npm ci, backend boot, auth/media/log-redaction regressions, wallet routes). When the reviewer says F's branch is merged into oc/phase-audit, run: git merge origin/oc/phase-audit (by hand, rules §1.4-1.5).

Push after every task. When finished, send the line from §7 and stop.
```

---

## Message B: OpenCode session for Phases 13, 14 and 16–21

```
Read docs/review/SESSION_MESSAGES_2026-10-08.md on origin/main: "Rules for every OpenCode session" and "Message B". They override older instructions where they differ.

You are session B: Phases 13, 14, 16, 17, 18, 19, 20 and 21.

Branch: oc/pa-13-21, created from origin/oc/phase-audit:
  git fetch origin && git checkout -b oc/pa-13-21 origin/oc/phase-audit && git push -u origin oc/pa-13-21
Push only this branch. Open one draft PR oc/pa-13-21 -> oc/phase-audit titled "[OC P13-P21] DO NOT MERGE". Never merge it.
Report file: docs/review/phase-audit/SESSION_B.md (one table per phase: Task | Status | Commits | Evidence | Fixed in).

Work list: every FAIL / PARTIAL / MISSING row of docs/review/phase-review/P13.md, P14.md and P16.md to P21.md, as re-checked on the current tip in TIP_a2de0b44.md. No task passes today.

Order (so that you do not collide with sessions A and F):
1. P13 (21 tasks), then P17, P18, P19, P20, P14.
   - Skip 14.4 and 14.18: session A owns them. Mark them "owned by session A".
   - 14.20 (media): wait for session F's media fix to be merged, then build on it.
2. P16 and P21 (sign-in, OTP, passwords, sessions, guests, uploads, headers): start only after the reviewer says session F's oc/tip-repair is merged into oc/phase-audit and you have run git merge origin/oc/phase-audit (by hand, rules §1.4-1.5). F restores the reverted guards (Q91 guest takeover, Q107 social audience/JWKS, R11 banned accounts, escapeHtml). You then build the remaining 16.x/21.x work on top. Never weaken those guards.
3. Phase 19: rows marked NOT-NOW or REMOVED-OK stay as they are. Write one line each in the report.

Phase 13 notes from the review:
- 13.R6: seo-indexing.listener.ts:327 must not force medical_review_status to "approved".
- 13.R5: errors in all six locales, a real 404 code, no e-mail sent to Sentry.
- 13.R20: write the final report the plan asks for.

Push after every task. When finished, send the line from §7 and stop.
```

---

## Message F: OpenCode session for fixes (tip repair, then the queue)

```
Read docs/review/SESSION_MESSAGES_2026-10-08.md on origin/main: "Rules for every OpenCode session" and "Message F". They override older instructions where they differ.

You are session F: fixes. Part 1 must be pushed and reported before Part 2.

PART 1 - repair the oc/phase-audit tip (sessions A and B wait for this)
Branch: oc/tip-repair, created from origin/oc/phase-audit. One draft PR oc/tip-repair -> oc/phase-audit titled "[OC tip-repair] DO NOT MERGE".
Report: docs/review/phase-audit/TIP_REPAIR.md.
Source of every item: docs/review/phase-review/TIP_a2de0b44.md ("Tip-wide facts" and "New defects").
For each regression, find the commit that added the fix and the merge that removed it, then re-apply the hunks by hand (rules §1.4). Never check out old files.

 F-1 backend `npm ci` fails with ERESOLVE (@nestjs/terminus 11.1.1 vs @nestjs/axios 12.0.1). Fix the versions so plain `npm ci` passes. No --legacy-peer-deps, no .npmrc override.
 F-2 the backend does not boot: MediaModule cannot resolve UploadSecurityService for MediaService. The base64 upload path must run UploadSecurityService again (strip EXIF/GPS).
 F-3 auth.service.ts guards removed by the bad merge:
     - Q91 guest takeover (convertGuest merges a guest into ANY account owning the e-mail);
     - Q107 social-login audience checks and Apple JWKS verification;
     - R11 refusal of banned/disabled accounts on OTP;
     - escapeHtml in the admin alert e-mails.
     Their specs (auth.guest-takeover, social-login.q107, disabled-account-tokens.r11, admin-alert-email.r11, auth-otp-channels) must be green and fail when the code is broken once. The fixes were in commit f42242d3; re-apply its hunks.
 F-4 media.controller.ts:115-128: canReadAsset returns true for ANY chat asset, and verifyChatUploadAllowed returns true with no check. Restore the thread-membership and consultation-status checks, with a test where another user gets 403.
 F-5 audit-log.interceptor.ts and structured-logger.ts: put email|phone|medical back into the redaction regexes, with a test.
 F-6 the wallet routes (POST /wallet/credit etc.) must be gone, so that test/security/f01-wallet.e2e-spec.ts passes. Do not edit that spec.
 F-7 the password-reset e-mails say "Nabdah Plus". Use the brand name from the copy guide, in all six locales.
 F-8 patient-app i18n coverage dropped to 55.7% (node scripts/i18n/validate-coverage.js). Restore the 66/108 missing keys in all six locales.
 F-9 tsc --noEmit errors in non-Phase-15 specs (media.controller.spec, pharmacy-order-manual-request.spec, storage.module.spec): fix the code or the setup, never weaken the assertion. Leave the Phase 15 spec errors to session A.
 F-10 the boot suite: test/security + test/journeys fully green. The two @nestjs/axios ESM suites (p3-provider-credential, p3-credential-rotation) must load. Acceptance oc-auth and oc-security must pass.
Push, report with the gate output, send the §7 line, then go on to Part 2.

PART 2 - Queue items on main
For each item: branch oc/<item-id> from origin/main, one PR into main titled "[OC <item-id>] <summary>". Never push to main.
Before each item, read its row in docs/review/OPENCODE_QUEUE.md and its acceptance folder backend/acceptance/<id>/ on origin/main. The item is done when `node scripts/run-acceptance.mjs <id>` passes and the gate is green. Never edit acceptance files.
Order:
 1. Q-12 (existing branch oc/Q-12, PR #587: push new commits there). It fails 0/9 today. When a provider has no location, geoPoint must be ABSENT (not null, not [0,0]), and the 2dsphere index must be sparse.
 2. D-17 (urgent: /providers leaks national id, phone, e-mail and IBAN today).
 3. S-7, then S-5, then S-6.
 4. D-14 (archive the data first), D-1, D-8, D-2, D-4, D-9.
 5. D-12, D-13, D-19, D-24, D-25, D-26, Q-21, D-32 (erasure).
 6. D-37 and D-38, once the reviewer has merged their acceptance specs.
One item at a time. Push and send the owner "<item-id> done, PR #<n>, acceptance x/y, gate green" after each.
```

---

## Message D: Claude design session (stopped)

```
Lead reviewer, 2026-10-08. First push anything you have not pushed yet.

State:
- Batch 9 (#711) is merged into main. I merged main into it and regenerated the no-raw-color baseline (3623 -> 3249).
- Batch 7 (#580) cannot merge: 15 conflicting files with main (PROGRESS, SCREEN_INVENTORY, WIRING_REPORT, inventory/screens.json, the six patient-web/messages/*.json, and the baselines locale-parity, no-literal-ui-string, no-raw-color, render-native-screen fixtures and .mjs).

Do now, in order:
1. On design/batch-7, run `git merge origin/main` (no rebase, no force-push). Resolve as follows:
   - locale JSON: keep the keys from both sides;
   - generated files and baselines: regenerate with their tools (--update only lowers);
   - PROGRESS: keep main's text and add Batch 7.
   Run `npm run test` in packages/design-tokens, push, and tell the owner.
2. Batch 7 insurance must follow owner decision 35 (docs/product/OWNER_DECISIONS_2026-10-06.md):
   - Nabd+ never contacts the insurer.
   - The text says that the facility requests the approval.
   - The patient sees the provider's decision: approved, partial or rejected, with the approval number, the co-pay and the reason.
   - No wording that suggests an automatic or NPHIES eligibility check.
   - Each string in all six locales.
3. Then Batches 10-13, as in PROGRESS "Next". Batch 7 + 8 + 9 Needs-review lines stay one line each.
Same rules as before: your design/<batch> branch only, one PR per batch, never merge, tokens only, six locales, no mock data.
```

---

## Message R: Claude review session (stopped)

```
Lead reviewer, 2026-10-08. First push anything you have not pushed yet.

Merged into main today: #707 (phase review P13-P23 and TIP_a2de0b44), #713, the specs #355 #582 #583 #604-#606 #608-#611 #613-#621 #700, and #703 (once green).
Still open and red (yours to fix):
- #353 and #354: Gitleaks (full history). Generate the secrets at runtime, as d-16/live-server.ts does now, and squash.
- #705: Patient Mobile build and tests.
- #706: CodeQL.

Next, in order:
1. Acceptance specs for the new queue items D-37 (insurance relay-only, decision 35) and D-38 (legal texts from legal_policies, plus the pendingAcceptances role bug), as backend/acceptance/d-37 and d-38. One PR each.
2. OpenCode now works in three sessions (docs/review/SESSION_MESSAGES_2026-10-08.md):
   - oc/tip-repair (F),
   - oc/pa-15-22-23 (A),
   - oc/pa-13-21 (B),
   each a draft PR into oc/phase-audit, plus Queue PRs into main.
   When one reports done, run the same nine-point review on its tip and write docs/review/phase-review/<session>_<sha>.md (PASS / FAIL per task, real outputs, mutation for new tests).
   Never merge. The lead reviewer merges.
   First check on every OpenCode merge: run `git diff --stat HEAD^1 HEAD` and flag every file whose added lines were deleted (the 443-file revert must not happen again).
3. For #584-#603: post one table (PR | verdict | blocking items) in a comment on #607. Q-12 (#587) stays FAIL until 9/9.
```
