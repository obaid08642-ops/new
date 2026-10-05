# Reviewer handoff (state on 2026-10-04)

Read this first in a new reviewer session, together with `AGENTS.md`. It replaces the conversation history: everything needed is in the repository. Older state is in git history (`git log -p docs/review/HANDOFF.md`).

## 1. The project

**Nabd Plus (نبض بلس)**, a Saudi health super-app.

| Part | Path | Stack | Notes |
|---|---|---|---|
| Backend | `backend/` | NestJS, MongoDB (replica set), Redis | API under `/api/v1`. `ValidationPipe` with whitelist + forbidNonWhitelisted. `@RequireIdempotency`, `@StepUp`, `@Roles` / `@RequirePermissions` |
| Patient app | `patient-app/` | Expo 57, React Native 0.86, expo-router | Scheme `nabdplus`, package `com.patient.nabd` |
| Provider app | `provider-app/` | Expo 57, React Navigation | 7 provider types: pharmacy, doctor, lab, radiology, home_care, hospital, ambulance. Package `com.nabd.provider` |
| Patient website | `patient-web/` | Next.js | BFF `/api/patient/[...path]` (allowlist; POST needs `idempotency-key`) |
| Admin | `admin/` | Next.js | BFF; CSRF header `x-admin-csrf`; admin login with email 2FA |
| Shared | `packages/` | ui, ui-native, design-tokens, brand, shared-contracts | |
| Deploy | `deploy/` | docker-compose, nginx, self-hosted LiveKit + coturn | OVH VPS, behind Cloudflare. No paid video API: LiveKit and TURN are self-hosted |

**Data.**
- About 20,990 medicines in 6 languages (ar, en, ur, hi, bn, fil) in **production**.
- The QA database has none: the import was never run there, and the export file is not in the repo.
- Catalogs: insurance (34 companies / 59 networks), labs 103, radiology 48, nursing 53, specialties 25.

## 2. Roles and rules (do not break)

**Reviewer (this role)**
- Tests everything live and never trusts claims.
- **Verifies every finding personally.** Sub-agent or helper results are leads, not verdicts: before a finding is reported to the owner or the agent, the reviewer reads the code and reproduces it (test or live run). Report only what was reproduced; mark anything else "not reproduced yet".
- **Fixes small defects personally, in `main` code and in the agent's unmerged code alike** (owner decision 2026-10-04). Small means: local to a few files, the correct behaviour is unambiguous, and no schema, API contract, product or design decision is involved. Examples: a missing guard or filter, a wrong id passed, a missing translation key, a red test caused by a one-line bug.
  - Defect in `main` code: `review/*` branch from `main` → PR → merge commit into `main`.
  - Defect in agent code not yet in `main`: `review/fix-*` branch from the tip of `fix/audit-2026-09` → PR into `fix/audit-2026-09` → merge commit. Commit tag `[REVIEW-FIX] <Q/F-id> <summary>`, with a regression test that fails before the fix. Update the row in `REVIEW_P13.md` / `REVIEW_P14.md` and `QA_DEFECTS.md` to "fixed by reviewer, <sha>".
- **Owner decision 2026-10-04 (supersedes the delegation rule): the reviewer fixes the large items too.** The agent made too many mistakes; Round 10 and Round 11 items are implemented by the reviewer session itself on `review/fix-*` branches → PR into `fix/audit-2026-09` (`[REVIEW-FIX]`), each with a failing-first test, the full gate, CI, the live gate and the native run. The agent receives no new work unless the owner says so.
  - Because the reviewer now also writes the fix, every fix PR gets an independent check before merge: a second reviewer session (or the lead reviewer) reads the diff and re-runs its test with the fix reverted (mutation).
  - Product decisions that the code cannot answer (money flows, legal text, which of two payment systems to keep) are still asked of the owner, once, with a recommended option.
- `QA_DEFECTS.md` and `REVIEW_REAUDIT_P1_P11.md` remain the work list; mark each row "fixed by reviewer, <sha>".
- After every merge into `main`, merges `main` into `fix/audit-2026-09`. Never force-push, never rewrite the agent's history, never revert agent commits; the only reviewer commits on that branch are these merges and `[REVIEW-FIX]` merges.
- **Merging the agent branch into `main`**: once the reviewer's own fixes are in and every remaining row is PASS or an accepted BLOCKED, with the full gate, CI, live gate and native run green. Never merge red.

**Agent**: works only on `fix/audit-2026-09` and follows `AGENTS.md`. Last agent commit: `b274e6f` (2026-10-04 14:30). **The 152 unmerged agent commits were reviewed on 2026-10-04 (tip `bb97c87`), one nine-point row each: 3 PASS, 149 FAIL** (`REVIEW_P13.md`, `REVIEW_P14.md`). Round 2 (same day) re-checked every row personally: the defects of 43 rows were fixed by the reviewer (44 fix commits), and 87 rows plus 6 newer commits go back to the agent. Phases 13 and 14: NOT APPROVED. Nothing merged into `main`. The agent's work list is **Round 10** in `REVIEW_REAUDIT_P1_P11.md`; new defects Q78–Q90 in `QA_DEFECTS.md`. Review copy for CI: draft PR #237 (`review/agent-tip-ci`, never merge). Native on the agent code: `review/maestro-agent-tip` (strict, workarounds off) and `review/maestro-agent-tip-q58` (only Q58 on).

**Owner**
- Reports go to the owner in **Arabic** (Egyptian-friendly, plain).
- The owner wants honesty: say what was **not** tested, and never claim a device or production test that did not happen.

**Never**
- Secrets in chat, commits or PRs (only `.env.production` mode 600, GitHub secrets, or environment secrets). Never ask the owner to paste a token.
- Model identifiers in commits or PRs.
- Deploying.
- CI, billing, credential or infrastructure changes without the owner's approval.
- Mock or placeholder data.

**Commit footer**
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KDwy8x86nsFewpbtfxbGM8
```
PR bodies end with the Claude Code line and the session link.

**Test data**: synthetic only, in the QA database. The owner approved deleting all test, placeholder and generated data (done 2026-10-02/03; manifests in `docs/review/evidence/qa_cleanup_*`).

## 3. Sources of truth

| What | Where |
|---|---|
| Audit plan and findings | `docs/audit/02_AGENT_EXECUTION_PLAN.md`, `docs/audit/01_FINAL_AUDIT_REPORT.md` |
| Agent work list, all rounds | `REVIEW_REAUDIT_P1_P11.md` (Rounds 1–9; latest: Round 9 plus its addendum) |
| QA defect register | `docs/review/QA_DEFECTS.md` (Q1–Q77) |
| Final QA report, coverage, performance | `docs/review/QA_FINAL_REPORT.md`, `COVERAGE_MATRIX.md`, `PERFORMANCE.md` |
| Unproven controls (code-check list for the agent, R8-1) | `docs/review/UNVERIFIED_CONTROLS.md` / `.json` |
| Catalog audit (single source of truth) | `docs/review/CATALOG_AUDIT.md` |
| Native CI proposal (owner approved: Android first) | `docs/review/NATIVE_CI_PROPOSAL.md`; implementation in `tools/native/` |
| Evidence | `docs/review/evidence/` |

## 4. Current verdict: NOT READY for release

**Critical (native, found by the Android run)**

| Id | Problem | Status |
|---|---|---|
| Q62 | patient-app Android build fails (react-native-callkeep: `jcenter()` + missing androidx dependency) | fixed on the agent branch; proven by the strict build (run `37203970270`, workarounds off) |
| Q67 | patient-app build fails: two WebRTC libraries (`react-native-webrtc` is unused) | fixed on the agent branch; proven by the strict build |
| Q68 | provider-app crashes at launch: `expo-image-manipulator ~14` on Expo 57 | fixed on the agent branch at build level (strict build); launch proven by the 7 provider crawls of run `37196546443` |
| Q69 | every map screen crashes on Android: no Google Maps key in `app.json` | **fixed by the reviewer** on the agent branch (`d47c599` patient, `0605147` provider): a "map unavailable" fallback without a key. The real key is the owner's |
| Q71 | patient-app session token never saved on native: SecureStore key had `@` | **fixed by the reviewer, PR #229** |

**Other critical**
- Q53: LiveKit API key and secret committed in `deploy/livekit/livekit.yaml` (repo is public). The agent removed the line on its branch (the file now reads only `${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}`, injected by `deploy.sh`), but `main` and the git history still hold it. The owner must rotate the key on the VPS; deleting the line alone is not enough.

**High**
- Q5, Q16, Q21, Q25, Q30, Q36, Q38;
- Q47, Q48 (website nurse and lab pages read empty collections);
- Q50 (hard-coded insurance list with invented co-pay);
- Q54, Q55 (TURN deny-list, IPv6 only);
- Q58, Q63 (clean install / Metro);
- Q59 (new-medicine suggestion broken);
- Q60 (admin-approved medicines never public: `indexing_eligibility`);
- Q64 (TURN never reaches the call clients);
- Q66 (no step-up on withdrawals, refunds, payouts, RBAC, impersonation);
- older: F2 (insurance), R23 (step-up unusable).

**Medium and low**: see `QA_DEFECTS.md`.

**Fixed by the reviewer** (each with a test and a live re-check)
- **Round 2 (2026-10-04):** 44 fix commits in the agent's unmerged code (35 in PR #240 → `1b12107`, 9 in PR #248) and Q78 + Q106 on `main` (PR #244, PR #249). Full list: `REVIEW_P13.md` section "Round 2"; ids Q100–Q106 in `QA_DEFECTS.md`;
- Q2, Q10–Q14, Q17, Q20, Q32, Q35, Q40, Q71;
- the icon font;
- tooling: Q6, Q7, Q18, Q19, Q26, Q27;
- the `register_type` harness now uploads licence documents.

## 5. Owner decisions already taken (do not re-ask)

- **Q38 notification mapping**:
  - `general` → `channels.push`
  - `appointments` → `categories.appointments`
  - `orders` → `categories.orders`
  - `medications` → `categories.health`
  - `doctorMessages` → `categories.chat`
  - `offers` → `categories.marketing` (off by default, opt-in)
  - `emergency`: always on, locked
  - `sound` and `vibration`: device-local
- **Q37**: keep the 5-minute buffer; the slot list and the booking check use one shared availability function.
- **Q42**: dispatch screens only where the API allows them; no wider permissions.
- **Single source (mandatory)**: every read of insurance, labs, radiology, nursing, specialties, medicines, doctors and providers comes from one backend source (`CATALOG_COLLECTIONS`). No static lists, fallback arrays or invented numbers.
- **Maestro / native E2E**: approved, Android first. iOS: a smoke run of the core journeys before each release.
- **UX audit** (duplicate screens, journey length): postponed by the owner; the backlog is R8-5.
- **Delete** all fake and test data in the QA database: approved and done.
- **Cloudflare**: handled in another session. A reviewer message with do / cancel items was given to the owner. Key points:
  - origin lock;
  - Full (strict);
  - rate limit on login/OTP only (not `/auth/refresh`, `/auth/heartbeat`, `/auth/me`);
  - no challenge on `/api`;
  - a WAF rule for `/api/v1/admin`;
  - no extra security headers (the site already sends them).

- **Phase 12 (design) is frozen** until the owner settles on one design (2026-10-04). Do not revert the P12 commits already on the agent branch (they are tooling and docs: `c6d7451` import rule, `5a59b6a` `docs/ux/ia.md`); just do not ask for or accept new P12 work. The five design CI checks that fail on every PR stay known-red and do not block a merge.
- **Order of work (owner, 2026-10-04)**: review the agent commits → merge to `main` → the owner deploys to **staging** → real tests on staging. Never test-then-deploy unreviewed code, and never production first.
- **Server access**: the reviewer needs HTTPS access to staging (API, admin, website) through a Cloudflare Access service token, not an SSH shell. Outbound traffic from the cloud container goes through an HTTPS proxy, so SSH is not the right channel. Deploys stay with the owner.
- **Maps (Q69)**: recommendation given, owner to confirm: keep Google Maps for display (the key comes from the build environment, never the repo), make every map screen survive a missing key, and keep paid calls (Places, Geocoding, Directions) to a minimum with caching. OpenStreetMap/MapLibre is free but weaker for Arabic addresses in Saudi Arabia and is a larger rework.

- **Calls (owner, 2026-10-04):** there is no separate voice consultation. A call is one LiveKit call; the doctor and the patient can each turn their camera on or off. One price (the consultation fee). `voice_consultation_fee` is removed from the design, and no separate voice/video product or price may be built.
- **Design rebuild branches:** design work goes on `design/<batch>` branches from `main` with a PR to `main` (one batch per PR, screenshots before/after, reviewed before merge). Never on `fix/audit-2026-09`.
- **Doctor profile fields** for the design (`scfhs_license_no`, `years_experience`, `qualifications[]`): added by the reviewer session in the backend, entered by the doctor at registration and approved by the admin. They stay hidden in the UI until filled, with no default or invented values.

## 6. Waiting on the owner

1. Rotate the LiveKit key (Q53).
2. Make the repository **private**. Recommended; GitHub's free Linux minutes cover the Android runs.
3. Staging access for real tests, all in the cloud environment settings (never in chat):
   - environment variables `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` (a Cloudflare Access service token scoped to staging only);
   - `STAGING_API_URL`, `STAGING_ADMIN_URL`, `STAGING_WEB_URL`;
   - a synthetic staging admin account: `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD` (with its 2FA mailbox reachable, or a documented test path);
   - the staging hostnames added under Network access → Allowed domains;
   - optional: authorize the Cloudflare connector in claude.ai connector settings for read-only checks of DNS, WAF and rate-limit rules.
4. The medicine catalog for QA: a staging copy, or the export file in the environment.
5. A server or staging check of video calls (LiveKit and coturn on OVH).
6. CI step `npx expo install --check` (added by the agent in `458c7b8` without approval): it fails on every Expo patch release. The reviewer proposes replacing it with a major-version alignment check. The owner decides; no CI change until then.
7. The SMS sender id stays `Nabdah` (the brand fix `7edc44e` did not touch it); change it only if the owner wants the registered sender renamed.

## 7. Native E2E pipeline (built 2026-10-03)

- **Workflow**: `.github/workflows/native-e2e.yml`. Runs on pushes to `review/maestro**` that touch `tools/native/**` or the workflow, or on manual dispatch.
- **Stages**:
  - `build`: release APKs (x86_64) via `tools/native/build_android.sh`;
  - `crawl`: 6 patient shards plus 7 provider types on an API-34 emulator against the real stack (`tools/native/ci_stack.sh`), with data seeded by the live journeys (`tools/native/seed.py`), sign-in by Maestro (`tools/native/flows/*.yaml`) and the adb crawler (`tools/native/native_crawl.py`);
  - `report`: `tools/native/report.py` writes `NATIVE_REPORT.md` (artifact `native-report`).
- **Test-build workarounds** in `build_android.sh`, each tied to an open defect: Q58 (`--legacy-peer-deps`), Q62 (jcenter → mavenCentral, LocalBroadcastManager), Q67 (drop `react-native-webrtc`), Q68 (swap SDK-mismatched packages in place). Remove each one when the agent fixes its defect, so the run proves the real build.
- **Run history**: see `gh api repos/obaid08642-ops/new/actions/runs?branch=review/maestro`.
  - The last complete run before the Q71 fix: 37105225306.
  - Run 37109973667 (with Q71 and the provider login fix) was in progress at handoff.
- **Artifacts**: the built-in `gh` cannot download them (blob storage). Use the GitHub tool `actions_get` with `download_workflow_run_artifact`, then `curl` the signed URL within about 10 minutes.
- **What the crawl proved so far**:
  - patient-app (guest and partly signed in): 227 screens;
  - the map crash (Q69);
  - the clipped RTL button (Q70);
  - stuck loading on `payments/result` (36 s), `otp`, `returns/detail` and `appointment-detail` (R8-4);
  - camera, dialer, share and photo picker hand-offs work.
- **Crawler artifacts already fixed in the tool** (not app defects):
  - input with spaces;
  - field matching after the keyboard moves the layout;
  - the emulator launcher's ANR dialog;
  - Maestro whole-label matching.

### 7c. Native on the agent code (Round 2, 2026-10-04)

- Run `37196546443` (agent tip, only the Q58 install workaround on): both builds and all 13 crawls succeeded. Provider doctor: 8 screens alive, no `FATAL EXCEPTION` in logcat, so **Q68 launch is proven**. Patient shard 0: 38/38 screens alive.
- **Q69 is not proven on the emulator.** The crawler's `/map` deep link lands on Home (the screenshot shows Home with the language menu open), and the provider crawl never reaches `DoctorLocationScreen`, so no map rendered with or without the fix. The Q69 guard is proven by unit tests only (`map-primitives-missing-key.test.tsx`, `PlatformMap.missing-key.test.tsx`). To prove it on a device, add a crawler step that opens a real map screen (patient nearby pharmacies, provider doctor location).
- Run `37203970270` (`1b12107`, **every workaround off**): patient-app and provider-app release builds succeeded, including plain `npm ci` for provider-app (Q58, Q62, Q67, Q68 proven at build level). The crawl was still running when this was written.

### 7b. Native baseline (run 37187173460, 2026-10-04)

All 13 jobs green: 6 patient shards and 7 provider types, every one signed in.

| App | Screens | Controls exercised | Crashes |
|---|---|---|---|
| Patient app | 227 | ~1,160 | 17 = Q69 maps, plus Q76 |
| Provider app, 7 types | 118 | ~600 | 1 = Q72 |

- Verified on Android: Q71 (sessions persist).
- Other findings from this baseline: Q75 (data export), Q73 (family chat polling 403), Q74 (hard-coded legal text), Q77 (raw payment error), and Q38 confirmed (notification settings 400).
- Provider depth is limited by the crawler (2 levels, 45 screens). Deeper provider flows are covered by the API journeys.

## 8. Reviewer next steps (in order)

**Status 2026-10-04 (Round 2):** step 0 done for `bb97c87`, and every row re-checked personally under the new owner rule (no unconfirmed results; the reviewer fixes small defects). Reviewer fixes: PR #240 (merged, `1b12107`) and PR #248 into `fix/audit-2026-09`; PR #244 and PR #249 on `main`. The remaining work is large and belongs to the agent (Round 10 status block in `REVIEW_REAUDIT_P1_P11.md`, then Round 11). Next: wait for the agent's pushes and repeat the nine-point review on each new commit, with the full gate, CI copy, live gate and native strict run. Merge to `main` only when every row is PASS or an accepted BLOCKED.

0. **Review the 152 unmerged agent commits first** (`git log origin/main..origin/fix/audit-2026-09 --no-merges`):
   - run the full `AGENTS.md` gate on the branch tip, and open a draft PR from a `review/*` copy so the whole CI runs;
   - run `native-e2e` on the agent code (merge the tip into a `review/maestro-*` branch; the paths filter needs a `tools/native/README.md` touch);
   - **9 commits say "deferred"** (`59e0d6b`, `13f560c`, `b20ecd3`, `cffbab5`, `0505115`, `7d27a4e`, `3c1eb45`, `909fed4`, `094122c`) and `6ca29c4` adds code nothing calls. `AGENTS.md` forbids deferring: send each back to the agent (wire it or `BLOCKED: <reason>`) in a new review round. Unwired code is not "done";
   - Phases 13 and 14 started without a written APPROVED review of the phase before; record the verdict per phase (`REVIEW_P13.md`, `REVIEW_P14.md`);
   - check every Q/R/X fix commit against its Verify line in `QA_DEFECTS.md` / `REVIEW_REAUDIT_P1_P11.md`, live where the local stack allows;
   - only then merge to `main`, sync, and tell the owner it is ready to deploy to staging.
   - **Per-commit checklist (owner requirement: check everything, trust nothing the agent wrote).** For every one of the 152 commits, record the result in `REVIEW_P13.md` / `REVIEW_P14.md` (one row per sha):
     1. read the **whole diff**, line by line, not the message or `AGENT_PROGRESS.md`;
     2. message vs diff: does the code do what the message and the plan task's "Do" say, completely? List anything claimed but missing, and anything changed that the task did not ask for;
     3. wiring: is the new code actually called from a real route, screen or job? `grep` every new export for callers. A helper nobody calls is NOT done;
     4. tests: do they assert the real behaviour (not mocks of the thing under test, not `expect(true)`)? Run them, and break the code on purpose once to see they fail;
     5. live proof: exercise the behaviour on the local stack (`tools/live`) or in the native run, and paste the real output;
     6. regressions: run the full gate plus the journeys touched by the files changed; compare with the previous results;
     7. hygiene: no mock data, fallbacks, hard-coded lists, `any`, TODOs, skipped tests, secrets, leftover debug code, or a second copy of an existing function;
     8. security and data: authorization on every new route, input validation (DTO rules), no PII in logs, no new public cache of private data;
     9. any agent result in `AGENT_PROGRESS.md` that cannot be reproduced counts as false and is reported as a defect.
     A commit passes only when all nine hold. Otherwise it goes back to the agent as a FAIL item with the evidence.
1. Re-run `native-e2e` after each agent push. Remove a test-build workaround when its defect is fixed, and add every real new defect to `QA_DEFECTS.md` with evidence. Never count crawler artifacts as app defects.
2. **Catalog audit §3** (`CATALOG_AUDIT.md`):
   - consumer map per catalog;
   - admin CRUD matrix;
   - cache propagation;
   - historical snapshots in orders and bookings;
   - re-test with the real 20,990 medicines once staging access exists.
3. **R8-2**: native features checked in code (push, biometrics, camera, LiveKit). **R8-3**: sensitive admin operations (Q66 lists the routes).
4. Then the full native run as a regression gate on every agent push. The UX audit when the owner asks.

## 9. Local live stack (cloud container) and pitfalls

- **Restart after a container reset**: `bash tools/live/up_stack.sh`. If dockerd fails with "pid … still running", `rm -f /var/run/docker.pid` first.
- **QA database**: `nabd_form2` in docker `p5mongo`. Use a separate DB name for experiments (for example `nabd_native_test`) and drop it afterwards.
- **Journeys**: `tools/live/j_*.py` (including the new `j_catalog_suggest.py` and `j_jobs.py`).
- **Crawlers**: `web_crawl.py`, `rn_web_crawl.py`, `rn_nav_crawl2.py`, `crash_sweep.py`.
- **Audits**:
  - `tools/audit/dtolint.py`, `clientbodies.js` + `dtocheck.js`;
  - `unverified_controls.py`, `catalog_sources.py`, `coverage_matrix.py`.
- **Pitfalls**:
  - `git stash -u` also stashes the untracked `node_modules` of the review worktree. Prefer committing, or stashing without `-u`.
  - `pkill -f <pattern>` can kill your own shell; kill by PID.
  - The permission system blocks deletions in the QA DB unless the owner approved that exact scope, and blocks probing production. Report it; do not work around it.
  - Pushing to `review/maestro` cancels the running native run (concurrency group).
  - Five CI checks fail on every PR already (Brand assets, Component contract 12.A7, Design tokens, Icon set 12.A6, Policy and source guard). They are not caused by review PRs.
