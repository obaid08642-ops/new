# P15 gate/CI notes (gate/CI half of Phase 15, branch `p15-gates`)

Scope: this branch touches ONLY `tools/`, `.github/` and this file. Anything
needed inside `patient-app/`, `provider-app/`, `patient-web/`, `admin/` or
`backend/` source is recorded as `DEFERRED-OUT-OF-SCOPE` with the exact owning
change. No existing gate assertion was changed (see "no-weakening proof" per
task). No live journey was executed on this machine: there is no `docker`
here, so Mongo/Redis/moto/SMTP/fake-Moyasar cannot run; every new/edited
script below is syntax-checked only, and every check output is quoted
verbatim. Do not treat anything here as "green" — the live gate (`bash
tools/live/run_gate.sh`) must run in CI / on a docker host.

Conventions the new journeys follow (read first, as required):
`tools/live/lib.py` (Client/Journey/step/summary, `NABD_API` base URL,
per-request `idempotency-key`, `##### n/m passed` summary line),
`tools/live/j_accounts.py` (app register payloads), `tools/live/j_payments.py`
(lab booking + intent/verify via the fake Moyasar), `tools/live/j_concurrency.py`
(barrier-fired parallel calls), `tools/live/perf_web.py` (Playwright CDP
`Network.emulateNetworkConditions` — the repo's supported throttle mechanism).

## 15.11 — chaos and failure drills in the live gate

Added:
- `tools/live/j_chaos.py` — six drills, each with an asserted degrade/retry/
  message behaviour plus the invariant "never loses data" (a canary patient
  written before the drill reads back identical afterwards via `GET /auth/me`):
  Redis down (liveness still answers; reads degrade, never hang; recovery);
  Mongo primary step-down (`rs.stepDown(30)`; retry/clear-error, recovery
  within 120 s); slow API (+2 s via the delay proxy; calls still succeed and
  the delay is observed, so the pass is not vacuous); payment gateway 500
  (intent refused with a message, no paid txn, retry-after-recovery pays
  exactly once, re-verify returns the same txn); SMS down (OTP still arrives
  by email — the `SmsService` disabled-by-default -> email+push fallback);
  LiveKit down (`/config` `video_calls=false` per F37, `/calls/initiate`
  fails fast with JSON, never a phantom room). Drills whose mechanism is
  unavailable SKIP explicitly (harness norm, cf. `j_admin_clicks.skip`) —
  never a silent pass.
- `tools/live/chaos_ctrl.sh` — pause/resume verbs matching how the harness
  really runs each dependency (`docker pause` on the redis container else
  SIGSTOP/SIGCONT; `rs.stepDown(30)` via mongosh on the `mongo`/`p5mongo`
  container; fake-Moyasar `__mode` flip).
- `tools/live/slow_proxy.py` — stdlib-only delay proxy (`--delay 2`,
  default port 9101) for the slow-API drill.
- `tools/live/fake_moyasar.py` (ADDITIVE): `MODE={'payments_fail': False}`,
  `GET/POST /__mode`, and a `500 gateway_failure_drill` branch ONLY on
  `POST /v1/payments` while the switch is on. All pre-existing routes and
  response shapes are byte-identical otherwise.
- Wiring: `j_chaos` appended to the `JOURNEYS` list in BOTH
  `tools/live/run_gate.sh` and `tools/live/gate_run.sh` (list append only).

Run: `bash tools/live/run_gate.sh` on a docker host (backend :8002, smtp_sink,
fake_moyasar :9100), or `python3 tools/live/j_chaos.py` alone.
Checks run here: `python3 -m py_compile tools/live/j_chaos.py
tools/live/slow_proxy.py tools/live/fake_moyasar.py` -> `PY_OK`;
`bash -n tools/live/chaos_ctrl.sh` -> `SH_OK`.
No-weakening proof: `git diff` on `fake_moyasar.py` shows only added lines
(MODE dict, `/__mode` handlers, one guarded 500 branch, docstring lines);
`run_gate.sh`/`gate_run.sh` show a one-word list append each.
DEFERRED-OUT-OF-SCOPE: (a) server-side latency-injection flag (e.g.
`CHAOS_LATENCY_MS` middleware in `backend/`) — backend agent owns it; the
proxy covers the drill until then. (b) a fake/SMS failure-injection double
for the SMS provider — backend agent owns it; the drill proves the
email-fallback path that exists today.
