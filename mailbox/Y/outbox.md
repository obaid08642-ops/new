# Lane Y outbox

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

