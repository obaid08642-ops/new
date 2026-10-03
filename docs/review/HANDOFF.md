# Reviewer handoff (state on 2026-10-03)

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
- Fixes small, low-risk defects with a regression test on a `review/*` branch → PR → merge commit into `main`.
- Delegates larger defects to the agent in `REVIEW_REAUDIT_P1_P11.md` and `docs/review/QA_DEFECTS.md`, each with Verify criteria.
- After every merge, merges `main` into `fix/audit-2026-09`. Never force-push; no other commits on that branch.

**Agent**: works only on `fix/audit-2026-09` and follows `AGENTS.md`. Last agent commit: `214c1c5`; nothing new since.

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
| QA defect register | `docs/review/QA_DEFECTS.md` (Q1–Q71) |
| Final QA report, coverage, performance | `docs/review/QA_FINAL_REPORT.md`, `COVERAGE_MATRIX.md`, `PERFORMANCE.md` |
| Unproven controls (code-check list for the agent, R8-1) | `docs/review/UNVERIFIED_CONTROLS.md` / `.json` |
| Catalog audit (single source of truth) | `docs/review/CATALOG_AUDIT.md` |
| Native CI proposal (owner approved: Android first) | `docs/review/NATIVE_CI_PROPOSAL.md`; implementation in `tools/native/` |
| Evidence | `docs/review/evidence/` |

## 4. Current verdict: NOT READY for release

**Critical (native, found by the Android run)**

| Id | Problem | Status |
|---|---|---|
| Q62 | patient-app Android build fails (react-native-callkeep: `jcenter()` + missing androidx dependency) | open |
| Q67 | patient-app build fails: two WebRTC libraries (`react-native-webrtc` is unused) | open |
| Q68 | provider-app crashes at launch: `expo-image-manipulator ~14` on Expo 57 | open |
| Q69 | every map screen crashes on Android: no Google Maps key in `app.json` | open |
| Q71 | patient-app session token never saved on native: SecureStore key had `@` | **fixed by the reviewer, PR #229** |

**Other critical**
- Q53: LiveKit API key and secret committed in `deploy/livekit/livekit.yaml` (repo is public). The owner must rotate the key; the agent removes the line and adds gitleaks.

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

## 6. Waiting on the owner

1. Rotate the LiveKit key (Q53).
2. Make the repository **private**. Recommended; GitHub's free Linux minutes cover the Android runs.
3. Staging access for real tests: a Cloudflare Access **service token** in the environment secrets (never in chat), plus `staging.nabd.plus` in the allowed hosts.
4. The medicine catalog for QA: a staging copy, or the export file in the environment.
5. A server or staging check of video calls (LiveKit and coturn on OVH).

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

## 8. Reviewer next steps (in order)

1. When run 37109973667 finishes:
   - download `native-report`;
   - confirm the patient app now stays signed in (Q71);
   - triage the signed-in screens and the provider types (login now scrolls to "Already have an account? Log In");
   - add every real defect to `QA_DEFECTS.md` with evidence;
   - never count crawler artifacts as app defects.
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
