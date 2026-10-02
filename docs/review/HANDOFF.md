# Reviewer handoff (state on 2026-10-02)

Read this first in a new reviewer session. It replaces the conversation history: everything needed is in the repo.

## Roles and rules
- **Reviewer** (this role):
  - tests everything live and never trusts claims;
  - fixes small defects (with a regression test) on a `review/*` branch, then PR → `main` (merge commit);
  - delegates large ones to the agent in `REVIEW_REAUDIT_P1_P11.md`;
  - after each merge, merges `main` into `fix/audit-2026-09` (never force; no other commits on that branch).
- **Agent**: works only on `fix/audit-2026-09` and follows `AGENTS.md`.
- **Owner**: reports go to the owner in Arabic.
- **Secrets**: never in chat, commits or PRs (only `.env.production` mode 600 or GitHub secrets).
- **Test data**: synthetic only. Test accounts created for a test are deleted afterwards (owner-approved).
- **Other bans**: no model identifiers in commits or PRs; do not deploy.

## Where things are
| What | Where |
|---|---|
| Audit plan and findings | `docs/audit/02_AGENT_EXECUTION_PLAN.md`, `docs/audit/01_FINAL_AUDIT_REPORT.md` |
| Agent work list (all open items, verdicts per round) | `REVIEW_REAUDIT_P1_P11.md` (latest: Round 6, F1–F10) |
| Reviewer audit reports (dated) | `docs/review/AUDIT_2026-10-01.md`, `docs/review/AUDIT_2026-10-02.md` |
| Evidence (crawls, form runs, screenshots) | `docs/review/evidence/` |
| Defect register | R1–R83 in the files above; round-6 findings F1–F10 |

## Open state
- **Round 6 verdict: CHANGES REQUIRED** (agent tip `38b1b04`). Mandatory items:
  - F1: gate red;
  - F2: insurance `save-policy`/`my-policy`/`benefits-summary` deleted;
  - F3: nursing `address_id` no longer resolved;
  - F4: `POST /providers/:id/approve` approves without documents;
  - F5: R1 override unusable, no step-up, vacuous specs;
  - F6–F10: partial work.
- **Coverage gaps** (not yet tested):
  - provider-app crawl coverage is low (doctor 8/29, lab 13/42, home_care 12/48, pharmacy 4/9, hospital 53/78). The crawler's replay breaks on async screens; fix the tool first;
  - patient app: 14 dynamic routes untested and 35 failed taps not analysed;
  - website and admin: pages that send no request are not analysed;
  - reschedule and refund flows; booking from inside the app; cross-app consistency per screen; icons.
- **Blocked** (need the owner):
  - physical device or native emulator (no KVM here; a GitHub Actions emulator job is the proposed route);
  - Moyasar sandbox keys; AI provider keys; SMS/WhatsApp sandbox.

## Live test stack (cloud container)
- Restart after a container reset: `bash tools/live/up_stack.sh`. It starts:
  - dockerd, the Mongo replica set `p5mongo` (DB `nabd_form2`), Redis;
  - the backend on :8002;
  - the website on :3000 and the admin on :3001;
  - the app web exports on :8081 (patient) and :8082 (provider);
  - mail sink :2525, S3 (moto) :9000, fake gateway :9100.
- The web exports and seed files live in `/tmp` and are lost when the container is replaced. Rebuild them:
  - app exports: the build command is in the header of `tools/live/rn_web_crawl.py`;
  - seeded patient and provider accounts: `tools/live/j_onboarding.py` and the journey scripts.
- Journeys: `tools/live/j_*.py`.
- Crawlers: `rn_web_crawl.py` (patient), `rn_nav_crawl.py` (provider), `ui_form_fill.py` (admin/website).
- Contract checks: `tools/audit/dtolint.py`, `clientbodies.js` + `dtocheck.js`, `routes.py`.
- Reviewer probes used in round 5/6: `tools/live/review_*.py` (R1 approval probe, loyalty race, capability check).
- Pitfalls:
  - `pkill -f <pattern>` can kill your own shell; kill by PID.
  - Do not run `routes.py --help` (it writes a file named `--help`).
  - Admin API calls need the BFF session (`j_admin.login()`); a direct token is in the `admin_access` cookie.

## Next steps
1. Merge `main` into `fix/audit-2026-09` after each review PR. Wait for the agent's round-6 fixes, then re-run the gate and re-test F1–F10 live.
2. Owner's full-project testing instructions are pending; the tool plan is in the capability audit, in the conversation summary below.
   - Primary driver: Playwright on all four UIs plus API/DB journeys.
   - Native: GitHub Actions emulator (needs owner approval).

## Capability summary (verified in this container)
| Status | Tools / features |
|---|---|
| Works | Playwright/Chromium (all 4 UIs incl. RN-web exports); Jest + react-test-renderer (patient-app); backend Jest/Supertest and boot suites; Vitest; Mongo/Redis; API journeys |
| Partial | RNTL: installed in provider-app, whose Jest has no preset. JSX tests do not run there |
| Not available here | Android emulator (no KVM), iOS (no macOS), Detox/Maestro/Appium on native |
| Never verified | Camera, push, biometrics |
