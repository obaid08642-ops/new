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

## 15.10 — device farm + browsers (CI side only)

Added:
- `.github/workflows/p15-web-browsers.yml` — new CI job (Chromium/Firefox/
  WebKit matrix) that builds patient-web, starts the standalone server and
  runs the committed `tools/live/web_browsers_smoke.mjs` per browser (key
  routes render non-blank, zero pageerrors, zero own-origin 5xx). Playwright
  is NOT assumed on the image: the job installs the pinned build itself
  (`npx --yes playwright@1.63.0 install --with-deps ...`, same pin style as
  `patient-production-ci.yml`). Naming/runners/caching match the existing
  workflows (`ubuntu-latest`, `pnpm/action-setup@v4` 10.4.1, node 22, pnpm
  cache on `patient-web/pnpm-lock.yaml`). Triggers on `patient-web/**`
  changes, the smoke script, or itself — plus manual dispatch.
- `tools/live/device_farm.yml` — committed, runnable farm matrix (Firebase
  Test Lab; choice justified in the file: `NATIVE_CI_PROPOSAL.md` already
  narrows to FTL-or-BrowserStack, and FTL takes EAS APK/IPA with a Robo
  crawl, gcloud CI auth and per-run billing). Covers small/large phones,
  tablet, low-end Android class, a Galaxy-class Samsung shell host, iPhone
  SE + Pro Max classes, ar_SA + en_US. Gaps stated in the file: no Huawei
  without GMS on any farm (physical-device manual pass per release) and
  model IDs are re-validated against the live catalog at run time.
- `tools/live/run_device_farm.sh` — runnable runner (`--apk`, optional
  `--ipa`): validates models vs the live catalog, runs the Robo matrix,
  writes a JSON report (default `/tmp/ftl-report.json`), exits non-zero on
  any failed model (0 blocking issues required per release).
- `.github/workflows/device-farm.yml` — manual per-release workflow that
  stops at an explicit BLOCKED step when farm secrets are absent.

Run: browsers run automatically in CI; the farm runs per release via the
dispatch workflow with `GCP_SA_KEY`/`GCLOUD_PROJECT`/`RESULTS_BUCKET`
secrets plus EAS-built binaries.
Checks run here: YAML parse via `python3 -c 'import yaml;
yaml.safe_load(...)'` (PyYAML on this machine) -> `YML_OK` for all three
files; `bash -n tools/live/run_device_farm.sh` -> `SH_OK`;
`node --check tools/live/web_browsers_smoke.mjs` -> `MJS_OK`.
BLOCKED: device farm is a paid external service with no account configured
(no GCP project/secrets, no EAS-built binaries here); the iOS leg
additionally needs an XCUITest bundle next to the .ipa (FTL has no iOS
Robo). Samsung Internet has no Playwright build: engine covered by the
Chromium leg, shell by the Galaxy farm device (stated in both files).

## 15.12 — ship fixes fast (CI/config side)

Added:
- `tools/live/ota/ota-channels.json` — channel/branch/percent contract
  (staging 100%, production-5pct canary 5%, production-full 100%) plus the
  staged procedure. Contract check done first: neither
  `patient-app/eas.json` nor `provider-app/eas.json` declares an `updates`
  channel today (verified by read — both end at `submit.production`), so
  wiring the channel into the builds is an app-source change owned by the
  app agents; this file is the contract those edits must satisfy (slugs
  verified by read: `patient-app/app.json` = `nabdah-plus`,
  `provider-app/app.json` = `nabd-plus-provider`).
- `tools/live/ota/rollout-5-percent.sh` — staged rollout (staging group ->
  identical canary on production-5pct, 24h watch, then promote the same
  group id). `tools/live/ota/rollback.sh` — instant rollback to the
  last-good group (prefers `eas update:republish` when the installed
  eas-cli offers it, else prints the manual channel-edit runbook and exits
  non-zero). Both use only long-stable `eas update` verbs; nothing about
  the CLI surface is assumed.
- `tools/live/j_killswitches.py` — one toggle test per 14.18 kill switch
  (keys from `backend/src/common/killswitches/killswitches.helper.ts`
  KILLSWITCH_FEATURES, verified in this worktree): OFF must reach
  `GET /config` as false, ON as true, then restore the pre-run value —
  each toggle provably changes client-visible behaviour. Plus the
  force-update (R6-5) verification: `/config` serves `app_versions`, and
  admin `GET`+`PUT /api/v1/admin/config/app-versions` (verified in
  `admin-config.controller.ts`) is exercised by writing back the exact
  value just read — write path proven operable with zero net change to the
  shared DB. Wired into both runners (`j_killswitches` append).
- Backend truth (another agent owns the fix): `FeatureFlagsService.
  isEnabled()` returns `false` for an absent row (verified in
  `feature-flags.service.ts:10-12`) and nothing seeds the six rows, so the
  journey's `seeded by default` step FAILS honestly until the seeding /
  fail-open-default fix lands. Said plainly: the propagation toggles pass,
  the baseline step does not — that is the intended honest signal, not a
  vacuous pass.

Run: `python3 tools/live/j_killswitches.py` on a docker host (after
`run_gate.sh`'s admin seed); OTA scripts need `EXPO_TOKEN` + real binaries.
Checks run here: `python3 -m py_compile tools/live/j_killswitches.py` ->
`PY_OK`; `bash -n` on both runners + both OTA scripts -> `SH_OK`;
`python3 -c 'import json; json.load(open("tools/live/ota/ota-channels.json"))'`
-> `JSON_OK`.
No-weakening proof: runners show a one-word `j_killswitches` append each.
BLOCKED: a test OTA to 5% + rollback is not runnable here (needs an Expo
account owning the project and a real channel-enabled binary).
DEFERRED-OUT-OF-SCOPE: `updates.channel` in both apps' `eas.json` +
corresponding `app.json` runtime config (app agents); the absent-flag
default / row seeding fix in `backend/` (backend agent).

## 15.6 — Schemathesis in CI

Added: `.github/workflows/schemathesis.yml` — brings up the live-gate stack
(Mongo rs0, redis service, moto S3 double, built backend via
`tools/live/start-backend.sh`, admin seed), installs the pinned fuzzer
itself (`schemathesis==4.*`, `hypothesis==6.*` — nothing assumed on the
image), then runs the backend-owned harness. Triggers on `backend/**`
changes, itself, or manual dispatch.
Contract check done first: this worktree has NO fuzz harness under
`backend/` (verified: `grep -rln schemathesis backend/` is empty apart from
this workflow; only `backend/package.json: "openapi:generate"` +
`scripts/generate-openapi.ts` exist). Per the task, no mismatch is
invented — the job fails loudly with the contract text when the harness is
absent.
Interface contract (DEFERRED-OUT-OF-SCOPE, backend agent owns it):
- path: `backend/scripts/schemathesis_fuzz.sh` (executable);
- CLI: `bash backend/scripts/schemathesis_fuzz.sh --base-url
  http://127.0.0.1:8002 --spec backend/openapi.json [--seed <int>]`;
- behaviour: exit 0 iff the run finds ZERO 5xx responses (auth is the
  harness's business — it may reuse `tools/live/seed_admin.js` — but the
  run must be self-sufficient given a backend started exactly as this
  workflow starts it, against the freshly built `backend/openapi.json`).
Checks run here: YAML parse via `python3 -c 'import yaml;
yaml.safe_load(...)'` (PyYAML) -> `YML_OK schemathesis`. The fuzz run
itself is not runnable here (no docker -> no backend under test).

## Global statements

- No live journey was executed on this machine. There is no `docker` here,
  so Mongo/Redis/moto/SMTP/fake-Moyasar cannot run and neither
  `tools/live/run_gate.sh` nor any `j_*.py` was launched. Every `.py` is
  `py_compile`-clean, every `.sh` passes `bash -n`, every YAML/JSON file
  parses, `node --check` passes on the smoke script. Nothing here is
  "verified"/"green" beyond those static checks — the live gate must run
  in CI / on a docker host.
- No-weakening proof: the ONLY edits to pre-existing files on this branch
  are (a) a failure-mode addition to `tools/live/fake_moyasar.py`
  (`MODE` dict, `GET/POST /__mode`, one 500 branch guarded by the switch,
  docstring lines — all default-off), and (b) one-word `JOURNEYS` appends
  in `tools/live/run_gate.sh` and `tools/live/gate_run.sh` as each new
  journey landed. No existing assertion, step name or check was altered.
  Prove it: `git diff --stat <base> HEAD` (base = parent of the first
  P15 commit) lists only added files plus those three files; `git diff
  <base> HEAD -- tools/live/fake_moyasar.py tools/live/run_gate.sh
  tools/live/gate_run.sh` shows additions only.
- Changed paths are confined to `tools/`, `.github/` and this file.
