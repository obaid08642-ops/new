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

## Gate P15 — throttled-network, rapid-tap, app-killed-during-payment

Added and wired (`JOURNEYS` append in both `run_gate.sh` and `gate_run.sh`,
list append only):
- `tools/live/j_rapid_tap.py` — 10 barrier-fired same-key sends for each of
  pay (`POST /payments/intent/lab/<bid>` -> one txn id, then one paid charge
  counted via `GET /moyasar/payments/me`), book (`POST /care/appointments`
  via the `j_concurrency` slot helpers -> one appointment id and one held
  slot), order (`POST /patient/pharmacy/orders` with one catalog med seeded
  through the admin screen payload -> one order id), send
  (`POST /chat/threads/<tid>/messages` with one `client_message_id` ->
  exactly one copy in the thread). Every burst also asserts no 5xx.
- `tools/live/j_app_killed_payment.py` — intent, gateway checkout, then STOP
  (no verify = dead app); reopen reads `GET /payments/booking/lab/<bid>`
  (pending, present, nothing paid); one verify pays; re-verify returns the
  same txn; exactly one paid row; the `/notifications` payment entry exists
  and the server truth it resolves to is paid.
- `tools/live/j_throttled_network.py` — Playwright CDP (the mechanism
  `tools/live/perf_web.py` already uses; `tc netem` cannot shape the
  journeys' loopback path and no proxy exists, so CDP is the one the repo
  can support): 3G loads slow-not-blank with the delay observed; 1% loss is
  injected at the Playwright route layer (CDP has no loss parameter — stated
  in the file); offline keeps cached content + asserts the banner and
  last-updated text; reconnect reloads and clears the banner.
- Fixture honesty: lab onboarding/approval and the medicines seed are
  admin-app actions no patient screen performs — the journeys say so in
  their docstrings and use the admin screen payloads verbatim. Everything
  patient-side is copied from the patient screens.

Run: `bash tools/live/run_gate.sh` on a docker host; each file also runs
alone (`python3 tools/live/j_rapid_tap.py`, ...). The throttled journey
needs patient-web at `NABD_PATIENT_WEB` (default http://127.0.0.1:3000)
plus python-playwright + Chromium, else it SKIPs explicitly.
Checks run here: `python3 -m py_compile tools/live/j_rapid_tap.py
tools/live/j_app_killed_payment.py tools/live/j_throttled_network.py` ->
`PY_OK`; `bash -n` on both runners -> `SH_OK`.
No-weakening proof: both runners show a `JOURNEYS=(...)` one-line append
each; no other line touched.
DEFERRED-OUT-OF-SCOPE (owning changes in app/backend source, other agents):
patient-web offline banner + last-updated time + action outbox with
replay-order and payments-never-queued (15.4 — the banner/last-updated steps
FAIL honestly until this lands; the replay step SKIPs until an outbox UI
contract exists to drive); real L2 1%-loss via `tc netem`/device farm;
FCM/APNs push delivery for the days-later half of 15.8 (the gate proves the
server-side notification payload instead).
