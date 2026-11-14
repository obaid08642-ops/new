# R16 — load priority and graceful degradation

Goal: browsing, reports and search can never starve payment, booking, sign-in and calls.

## What was built (all in `backend/src/common`)
| Piece | File | Rule |
|---|---|---|
| Admission control | `admission.ts` | Route classes from R5. Critical (payment, auth, booking, realtime) are never refused. Low classes (search, public_read, user_read, admin, other) share one in-flight budget of 48 (`LOW_PRIORITY_MAX_INFLIGHT`, 60 % of the R7 API DB pool of 80) with per-class caps (search 24, public_read 32, user_read 40, admin 12, other 24). Over a cap a GET/HEAD gets 503 `server_busy` + `Retry-After: 3`. Low-class writes are not refused. Always open: config, health, observability, `.well-known`, `auth/me|refresh|session`. |
| Overload level | `overload.ts` | 0/1/2 from event-loop lag (150/250 ms), heap (80/85 %), low-budget fill (90 %). Escalates at once, drops one level only after 30 s calm. Gauge `nabd_overload_level`. Level 1 sheds `admin` reads; level 2 sheds admin, other, search, public_read, user_read reads. |
| Auto-degrade flags | `overload.ts`, `killswitches.helper.ts` | `shouldDegrade(feature)` = kill switch OR overload level. Level 1: recommendations, nudges, analytics ingestion, search suggestions. Level 2 adds live map and AI. The six existing `isKilled` call sites use it. |
| Per-route timeout budget | `route-timeout.interceptor.ts` | GET/HEAD only: payment 10 s, auth 10 s, booking 15 s, search 5 s, public_read 5 s, user_read 10 s, admin 30 s, other 10 s, realtime none. Timeout → 504 `request_timeout` + `Retry-After: 5`. SSE, `/stream`, `/events`, export and download paths are exempt. |
| Priority-aware adaptive limit | `adaptive-concurrency.interceptor.ts` | The old global interceptor refused everything at one limit. Critical classes now get 2× the limit. |

Writes are deliberately not timed out: the handler keeps running after a cut response, so a client retry would risk double processing.

## Metrics
`nabd_admission_low_inflight`, `nabd_admission_rejected_cap_total`, `nabd_admission_rejected_level_total`, `nabd_overload_level`.

## Tests
`overload-admission.spec.ts`: governor levels and hysteresis, auto-degrade lists, admission rules, real HTTP (250 slow searches vs 40 payments: all payments 200, search concurrency never above the budget, the rest 503 + Retry-After, budget released to 0), timeouts, priority-aware adaptive limit.

## Honest limits
- No k6 or staging proof yet (needs the R6 staging stack). The caps are proposals to tune against production traffic.
- Counters are per process, not cluster-wide.
- "Separate pools/queues" is done as in-process bulkheads. Separate BullMQ queues or worker concurrency per priority are not done.
- Latency inside the HTTP test is dominated by client and server sharing one event loop (about 250 ms even with a plain express app), so the test bounds it loosely and asserts status, cap and release exactly.
- The 503 `server_busy` is a new response for clients; the R22 retry policy must treat it as retryable with `Retry-After` (GET only).
- The existing `@ShedOnOverload()` guard is kept; it now shares the same load signal.
