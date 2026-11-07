# Lane Y outbox

## 2026-11-07 17:xx UTC — lead order 2: D, A, B done; #2398 note
Status: in progress
PR: #2453 (CI: pending after fix d65c40a), #2458 uptime probe (pending), #2459 gitleaks (pending), #2450 / #2451 / #2452 no red seen, #2398 s/speed-sweep (CI: RED lighthouse only)
What changed:
- D: CodeQL on #2453 = tools/supply-chain/majors.mjs:50 incomplete sanitization (`replace("/")` once). Now `replaceAll`; its 4 tests pass. Pushed.
- A (#2458): uptime + auto-reboot probe now GET https://api.nabd.plus/api/v1/health/liveness (route from backend/src/health.controller.ts), API_URL env, new test; 18 ops tests OK.
- B (#2459): 18 fixture fingerprints added to .gitleaksignore. **SECURITY: 3 findings are NOT fixtures and I did not ignore them**: historical backend/infra/fastapi/server.py lines 41-42 (an R2 access key of 32 hex and secret of 64 hex) and deploy/coturn/turnserver.conf line 13 (48-char static-auth-secret). Owner should rotate them; the gitleaks job stays red until then (or until you decide to ignore them after rotation). Values never printed.
- #2398: lighthouse red only on resource-summary.script.size /ar 179213, /ar/c 176985, /ar/consultations/doctors 182962 vs 174080; identical to the numbers before my main merge, so this branch does not move them; per your answer it is lane X's script-size gap. Budget not raised.
- Note: my first commit on #2458 carries a Co-Authored-By model-name trailer (added by my session template before I saw rule 8); later commits have none. Not rewriting history.
Left: C (Android manifest merger), R22 then R9, docs-only PR for stale m6/PROGRESS, HEAD-vs-GET small PR if needed. Open PRs: 8 (over cap of 3); the takeovers need green first.


## 2026-11-07 12:3x UTC — Item 5 check, CI wait
Status: in progress (waiting on CI queue + one question)
PR: #2450, #2452, #2398, #2451, #2453: no red so far; the runs are queued/in progress (GitHub runner backlog). #2452 and #2453 are green except Live gate.
What changed:
- Item 5: M3-M8 are already on main: backend/src/modules/ordering (engine, broadcast, approval, lifecycle + specs), modules/instant-consultation, medical-orders, journeys tools/live/j_ordering_{engine,asap,insurance,safeguards}.py. docs/design/needs-review/m6-blocked.json and PROGRESS.md still say "waits for M3-M8" and look stale (m6 rows are marked "fixed #1784"). No new engine PR from me unless you name a concrete missing part.
Left / blockers / questions:
- QUESTION 1: define R6, R8-R10, R22-R25 (not in the repo).
- QUESTION 2: item 5: which exact M-part is still missing? Otherwise I found nothing to build.
- I stay at 5 open PRs (cap 3) until the queue clears; then fix any red.


## 2026-11-07 12:0x UTC — Items 1-4 status
Status: in progress
PR: #2450 s/edge-cache (CI pending), #2452 s/warmup-404 (CI: all green except Live gate queued), #2398 s/speed-sweep (merged main clean, CI queued), #2451 r/r19-data-residency (merged main, pushed, CI queued), #2453 r/r20-supply-chain (already up to date; CI green except Patient Production CI / Security Scan queued)
What changed:
- Item 2 (OCR off Replicate): nothing to build. Main already skips Replicate for chat and vision (`NON_CHAT_PROVIDERS` in ai-provider-catalog.ts, used by ai-gateway.service.ts attemptPlan; prescriptionOcr -> ocrTranslate -> genVision). Sentry NABD-BACKEND-21 last seen 2026-10-26. OCR in production needs a vision provider with a free-tier key (gemini/openai/groq) configured in the AI control; I added no key and no provider. No PR.
- Items 1, 3, 4(first part): merged origin/main into each branch, pushed to the same branch.
Left / blockers / questions:
- I hold 5 open takeover PRs (over the cap of 3), so I am fixing CI reds on these before starting new branches.
- QUESTION: the R backlog "R22-R25, R6, R8-R10" is not defined in docs/platform or docs/review (only hints: R6 staging stack/load run, R7 data tier, R9 ClamAV off host, R22 client retry policy for 503 server_busy). Please give a one-line definition per item, or say which to pick. Meanwhile I will go to the ordering engine (item 5) once PRs are green.


## 2026-11-07 11:3x UTC — Item 1: edge cache #2450 / #2452
Status: in progress
PR: #2450 s/edge-cache (CI: pending after merge of main, df6db36), #2452 s/warmup-404 (CI: pending, was up to date with main)
What changed:
- Merged origin/main into s/edge-cache (clean) and pushed to the same branch. Unit tests in tools/ops/tests pass locally (366 OK for the warmup branch; test_cf_edge_check 4 OK).
- s/warmup-404 needed no merge; I pushed nothing.
- Scheduled task created (hourly, at :17, session-only, auto-expires after 7 days, so it needs re-creating then).
Left / blockers / questions:
- I could NOT run 54-edge-cache-check.sh live: this sandbox's proxy returns 403 for nabd.plus, so `cf-cache-status: HIT` is not proven from here. The branch's earlier note (S_STATE.md) records 10 of 10 within 4 asks from a previous session; please verify on your side.
- Waiting for CI on both, then item 2 (OCR off Replicate).

