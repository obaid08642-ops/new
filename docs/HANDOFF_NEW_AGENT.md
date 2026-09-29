# Handover for a new implementing agent (Nabd Plus)

You are the **implementing agent**. A separate reviewer (another Claude session) reviews every push, fixes small issues and merges to `main`. **You never merge and never push to `main`.**

## 1. Repository and branch
- Repo: `https://github.com/obaid08642-ops/new`
- Your branch: **`fix/audit-2026-09`**. Work only here, and never force-push.
- Start every session with:
  ```bash
  git fetch origin
  git checkout fix/audit-2026-09
  git pull --ff-only origin fix/audit-2026-09
  ```
- The reviewer regularly merges `main` into your branch; those merge commits are titled `[REVIEW] merge main …`. **Never revert `[REVIEW-*]` changes.** If `git pull --ff-only` fails because you have local commits, run `git pull --no-rebase origin fix/audit-2026-09`, which creates a merge commit.

## 2. Read in this order before writing code
1. `AGENTS.md`: the rules. They override your defaults.
2. `docs/audit/02_AGENT_EXECUTION_PLAN.md`: the contract. Each task has **Do** and **Verify**.
3. `REVIEW_P7_P8.md`: the latest review. **R7-1..R7-8 are mandatory before anything else.**
4. `REVIEW_P6.md` and `REVIEW_P5.md`: earlier verdicts, and the process lessons in them.
5. `docs/audit/04_DISCOVERY_ENGAGEMENT_AUDIT.md`: evidence for PHASE 7E and 7F.
6. `docs/audit/03_LIVE_JOURNEY_FINDINGS.md` (LJ items; all were merged) and `AGENT_PROGRESS.md` (read the last 3 sections).

## 3. Where the project is (2026-09-29)
| Phase | State |
|---|---|
| 0–8, R6 (Phase 6 review items), LJ-01..LJ-10 | Reviewed and merged to `main` (PRs #202–#208) |
| **R7-1..R7-8** (`REVIEW_P7_P8.md`) | **Open. Do these first.** |
| 7A (no patient wallet, loyalty caps) | Pushed as `59d6b31` and **not reviewed yet**. Finish it and make sure its Verify steps pass. |
| 7B, 7C, 7D | Not started |
| **7E** (notifications, deep links) and **7F** (search engines, AI assistants) | New. Added by the reviewer on 2026-09-29. |
| 9 | F50, F51, F53, F78 merged; F52 (Expo SDK upgrade) left |
| 10, 11 | Not started (Phase 10 includes page speed F82) |

**Order of work:** R7 → finish 7A → 7B → 7C → 7D → 7E → 7F → 9 (F52) → 10 → 11.
- One phase at a time.
- After each phase, push and report, then **stop and wait** for the reviewer's verdict before starting the next phase.

## 4. Commits and pushes
- One task per commit: `[P<phase>.<task>] <F-id or R7-x or N1/S3…> <summary>`, for example `[7E.N1] patient push tap router`.
- Never use `--no-verify`, never skip or delete tests, and never weaken a check to make it pass.
- Never write "verified" without running the check. A test that skips must be reported as a **FAIL**, not a PASS.
- If a task is truly impossible, write `BLOCKED: <exact reason>` in `AGENT_PROGRESS.md` and stop. Do not defer or partly do a task.
- Push with `git push origin fix/audit-2026-09`.
- After pushing, report exactly: `Phase <n> complete (or: Review round <r> fixes done), ready for review. Tip: <sha>. Gate outputs are in AGENT_PROGRESS.md.`

## 5. Local stack (the same as the CI "live" job)
Requirements: Node 22, Python 3.12, Docker, pnpm (for patient-web).
```bash
# MongoDB 7 replica set + Redis 7
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
sleep 5 && docker exec mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
docker run -d --name redis -p 6379:6379 redis:7

# Test doubles: S3 (moto), SMTP sink for OTP/2FA mails, fake Moyasar gateway
pip install 'moto[server]==5.*' boto3 aiosmtpd
nohup moto_server -p 9000 >/tmp/moto.log 2>&1 &
nohup python3 tools/live/smtp_sink.py >/tmp/smtp.log 2>&1 &
(cd tools/live && nohup python3 fake_moyasar.py >/tmp/moyasar.log 2>&1 &)
python3 -c "import boto3; boto3.client('s3', endpoint_url='http://127.0.0.1:9000', aws_access_key_id='live', aws_secret_access_key='live-secret', region_name='us-east-1').create_bucket(Bucket='nabd-live')"

# Backend on a FRESH database, then the admin BFF
cd backend && npm ci && npm run build
DB_NAME=nabd_fresh node ../tools/live/seed_admin.js
DB_NAME=nabd_fresh bash ../tools/live/start-backend.sh
cd ../admin && npm ci && npx next build
ADMIN_BACKEND_URL=http://127.0.0.1:8002 NODE_ENV=production nohup npx next start -p 3001 -H 127.0.0.1 >/tmp/admin.log 2>&1 &

# Patient website (optional for the gate; needed for 7F SEO checks)
cd ../patient-web && pnpm install && pnpm build && cd .. && bash tools/live/start-web.sh patient-web
```

## 6. Gate before every push
Paste the real output tails into `AGENT_PROGRESS.md`.
```bash
# Backend
cd backend && npx tsc --noEmit && npx jest --silent
# Admin
cd admin && npx tsc --noEmit && npx next build
# Patient website
cd patient-web && npx tsc --noEmit && npx vitest run
# Patient app: tsc does NOT catch broken imports; expo export does
cd patient-app && npx tsc --noEmit && npx jest && npx expo export
# Provider app
cd provider-app && npx tsc --noEmit && npx jest
# Static checks
node tools/audit/clientbodies.js > /tmp/c.json && node tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
python3 tools/audit/idemcheck.py /tmp/c.json                                                 # 0 calls without a key
node tools/audit/schemadrift.js                                                              # 0
# Live gate on a fresh DB: every journey 100%
bash tools/live/run_gate.sh
# Also run the extra journeys: j_insurance, j_returns, j_chat, j_admin_ops
cd tools/live && for j in j_insurance j_returns j_chat j_admin_ops; do python3 $j.py | tail -1; done
# After R7-1: the admin click tests in a real browser
CHROMIUM=/path/to/chromium python3 tools/live/j_admin_clicks.py
```

## 7. Lessons from the reviews (the same mistakes cost several rounds)
- **Build every app you touch** before claiming green. The admin once did not compile, and the patient app once did not bundle, while the notes said "green".
- **"Admin can edit X" is done only when the product uses X.** Grep for the reader of each setting (templates, fees, app versions all had to be re-wired).
- **Use the real collections and fields:**
  - `pharmacy_orders` (not `orders`), whose amount is `totals.total` and owner is `patient_account_id`;
  - lab bookings use `state`, not `status`;
  - `supportrequests`;
  - the catalog is `medicines`, `lab_services`, …, as listed in `CATALOG_COLLECTIONS`.
- **Every query value from a request goes through `{ $eq: String(v) }`**, otherwise `?x[$ne]=1` injects an operator. CodeQL blocks this on every PR.
- **When you change code, update its tests in the same commit.**
- **When you move files, fix relative imports**, then run `npx expo export`.
- **Live journeys in `tools/live` are the proof.** Keep them green, and add a journey step for each new flow.
