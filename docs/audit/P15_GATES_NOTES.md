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

## Fix round

Independent-reviewer findings F1-F12, one commit each, on top of `1f8681f`.
Nothing was pushed. Changed paths stay inside `tools/`, `.github/` and this
file. **The live gate was NOT run: there is no `docker` on this machine, so
Mongo/Redis/moto/smtp_sink/fake_moyasar and any backend under test cannot start
here.** Nothing below is "green" — it is static analysis plus the explicit
runtime probes recorded per item. No journey output is quoted because none was
produced.

### Backend contract, verified read-only before wiring (no backend file touched)

`git -C /Users/ahmedobaid/nabd-plus show p15-backend:<path>`:

- `backend/src/common/chaos-switches.ts`: `isChaosFail` compares
  `process.env.CHAOS_FAIL_SMS === '1'` / `process.env.CHAOS_FAIL_LIVEKIT === '1'`.
- `backend/src/modules/sms/sms.service.ts:53-59`: the switch is the FIRST thing
  `sendOtp()` does — before the `isEnabled()` check and before any provider HTTP
  call — returning `false`, which is the documented "fall back to email+push"
  signal. MATCHES the contract.
- `backend/src/modules/livekit/livekit.service.ts:380-386`: `roomService()`
  returns `null` when the switch is on, i.e. exactly the unconfigured path
  (`getRoomParticipants` -> `[]`, `muteParticipant` -> `{success:false,
  reason:'livekit_not_configured'}`, `removeParticipant` ->
  `NotFoundException('livekit_not_configured')`). All three are reachable over
  HTTP via `livekit.controller.ts` (`GET /calls/admin/rooms/:room/participants`,
  `POST /calls/admin/rooms/:room/mute/:pid`, `POST /calls/admin/rooms/:room/remove/:pid`).
  MATCHES.
- `backend/src/modules/chat/chat.service.ts:319-327`: the 11000 catch re-reads the
  `(client_message_id, thread_id, sender_id)` winner and returns it. The atomic
  path F11 depends on IS present.
- `backend/src/modules/notifications/notifications.service.ts:850-866`
  (`onLabBookingCreated`) and `:867-905` (`onLabBookingStateChanged`): the lab
  booking id is written to `action.route` as `/labs/booking/view/<booking_id>`;
  `payment.completed` (`:1167-1178`) carries no booking id at all.
  `start-backend.sh:28,36` confirms the backend is wired to the SMTP sink (:2525)
  and fake Moyasar (:9100).

### Per finding

- **F1 FIXED** (`tools/live/j_killswitches.py`): the "seeded by default" baseline
  was read AFTER the toggle loop, and `POST /admin/feature-flags/:key` is an
  upsert, so `missing` was always empty — a pass by construction. The snapshot is
  now taken and asserted BEFORE the first write (step name and `not missing`
  assertion unchanged), and a new post-loop step proves the toggles left no drift
  and no vanished row. Stale docstring text about the absent-row default replaced
  with the landed backend contract (`isEnabled` -> null, `ensureSeeded()`).
- **F2 FIXED** (`tools/live/gate_run.sh`): `j_payments` added to `JOURNEYS`;
  both runners are now byte-identical (verified, see checks).
- **F3 FIXED** (`tools/live/j_chaos.py`): `... in (txn.id, v.id, None)` removed the
  `None` escape hatch. Both ids must exist and be equal.
- **F4 FIXED** (`tools/live/j_chaos.py`): Redis, Mongo and LiveKit degrade steps
  now require `status < 500` in addition to their existing message/non-hang
  assertions (LiveKit keeps its `>= 400` fail-fast bound).
- **F5 FIXED** (`tools/live/chaos_ctrl.sh`, `tools/live/j_chaos.py`): new
  `backend-chaos`/`backend-nochaos` verbs restart the backend with
  `CHAOS_FAIL_SMS=1` / `CHAOS_FAIL_LIVEKIT=1` (allowlisted to those two names;
  `env -u` for the off direction so the variable is genuinely removed) and print
  what could be PROVED: `old_pids`, `new_pids`, `env_state`. Both drills require
  a proven new process before asserting anything; the SMS drill additionally
  requires the runtime marker `CHAOS_FAIL_SMS=1` in the backend log (platform
  independent), and the LiveKit drill asserts the three documented degraded
  answers over admin HTTP. Unprovable -> FAIL + explicit SKIP, never a pass.
  Closes the earlier `DEFERRED-OUT-OF-SCOPE: (b) a fake SMS failure-injection
  double` line for the SMS/LiveKit drills.
- **F6 FIXED** (`tools/live/j_throttled_network.py`): (a) "last updated" now needs
  an explicit `آخر تحديث`/`Last updated` label — the old pattern accepted a bare
  `ago`/`منذ`/`updated`, i.e. any relative timestamp on any page; (b) `cdp()`
  reports whether the browser accepted the profile and the 3G step requires that
  AND `elapsed >= 2.0`, plus new steps for the offline and reconnect profiles;
  (c) the queue-replay SKIP became a real server-side keyed-replay check mirroring
  the client's own request (`patient-app/src/context/SocketContext.tsx`:
  `Idempotency-Key: chat-offline-<id>` + `client_message_id`): one message id,
  `idempotent_replay: true` on the second answer, exactly one copy in the thread.
  It runs BEFORE the browser half, because `live-gate.yml` starts the backend but
  not patient-web, so the browser half SKIPs in CI. The SKIP that remains is only
  the device-side outbox, naming the verified reason
  (`patient-app/src/utils/offlineQueue.ts` throws
  `OfflineMessageQueueDisabledError`, `getOfflineMessages()` returns `[]`).
- **F7 FIXED** (`.github/workflows/p15-web-browsers.yml`): `NABD_API_BASE_URL` is
  one workflow-level env, defaulting to the repo's documented staging host
  (`deploy/nginx/conf.d/staging.conf`: `server_name staging.nabd.plus`, which
  proxies `/api/v1/` to the isolated staging backend) and overridable with the
  `NABD_STAGING_API_BASE_URL` repository variable. A guard step FAILS the job if
  the resolved host is any production host (`api.nabd.plus`, `nabd.plus`,
  `www.`, `admin.`, `provider.`, `cdn.`), including behind userinfo or a port.
  Precondition, stated in the file: staging must actually be deployed and
  reachable — `docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md:35` records that it is not
  defined in the production compose file. Until then this job fails loudly
  instead of silently passing. `lighthouse.yml` has the same production URL but is
  not in this finding's scope and was left untouched.
- **F8 FIXED** (`tools/live/run_device_farm.sh`): an empty parse now exits
  non-zero with an explicit BLOCKED message before the catalog validation (with
  no models, both loops were skipped and the run exited 0 having covered zero
  devices).
- **F9 FIXED** (`.github/workflows/schemathesis.yml`): `smtp_sink.py` (:2525) and
  `fake_moyasar.py` (:9100) are started alongside moto, and both ports are probed
  with a hard failure when a double is down; the job also triggers on pushes to
  `main`, not only on pull requests.
- **F10 FIXED** (`tools/live/ota/rollout-5-percent.sh`,
  `tools/live/ota/rollback.sh`): the rollout probes `eas update --help` on the
  INSTALLED cli (verified here: eas-cli 19.1.0 documents `--json`) and reads the
  group id from the JSON payload, keeping the text parser only as a fallback for
  builds without `--json`. An unrecognised shape exits non-zero with the eas
  version, the `--json` state and the head of the output — it never guesses an id.
  A failing publish or canary now stops the run. `rollback.sh` no longer claims a
  success it did not get: eas's real exit code is captured before the `if` (an
  `if` whose condition is false reports 0), a failed republish prints a loud
  "AUTOMATED ROLLBACK FAILED (rc=…)" plus the manual runbook and exits 1, and the
  runbook probes every verb it tells the operator to run before printing it.
- **F11 FIXED** (`tools/live/j_rapid_tap.py`): the atomic dedup is verified
  present (see above), so the send burst is now held to it: all 10 racers must
  answer 2xx with one identical message id. The pre-existing thread-copy and
  no-5xx steps are untouched.
- **F12 FIXED**: `j_chaos.py` initialises `pat`/`acct` before the slow-API `try`
  and `canary_intact` reports an explicit failure when no canary exists (no
  NameError, no silent skip); `j_app_killed_payment.py` matches the booking id on
  the `action.route` field with an exact suffix instead of `bid in str(n)`, and
  prints the routes it saw when it finds nothing; `chaos_ctrl.sh`'s docker check
  pipes into `head` (always exit 0), so the "no docker" branch was dead — it now
  runs `docker ps` directly, and the redis drill falls through to the local
  `redis-server` path as intended when docker is absent.

### Every static check run here (verbatim results)

```
$ python3 -m py_compile tools/live/j_app_killed_payment.py tools/live/j_chaos.py \
    tools/live/j_killswitches.py tools/live/j_rapid_tap.py tools/live/j_throttled_network.py
PY_OK tools/live/j_app_killed_payment.py
PY_OK tools/live/j_chaos.py
PY_OK tools/live/j_killswitches.py
PY_OK tools/live/j_rapid_tap.py
PY_OK tools/live/j_throttled_network.py
$ bash -n <each touched .sh>
SH_OK tools/live/chaos_ctrl.sh
SH_OK tools/live/gate_run.sh
SH_OK tools/live/ota/rollback.sh
SH_OK tools/live/ota/rollout-5-percent.sh
SH_OK tools/live/run_device_farm.sh
$ python3 -c "import yaml; yaml.safe_load(open(f))" <each touched .yml>
YML_OK .github/workflows/p15-web-browsers.yml
YML_OK .github/workflows/schemathesis.yml
```

No `.mjs` file was touched this round (`web_browsers_smoke.mjs` is unchanged and
still `node --check` clean from the original commit).

Behavioural probes that DID run here (no backend, no docker needed):

- F2: `JOURNEYS` lists compared -> `JOURNEYS_IDENTICAL` (run_gate.sh ==
  gate_run.sh).
- F3: the old and new predicate evaluated on 4 inputs — "both ids match"
  old=True/new=True, "second id differs" False/False, "both ids absent"
  **old=True/new=False**, "second id absent" **old=True/new=False**.
- F4/F3 static diff shows only added terms (`status < 500`, `bool(v_id)`).
- F5 `chaos_ctrl.sh`:
  - `backend-chaos EVIL_VAR=1` -> `BLOCKED: refusing to set 'EVIL_VAR=1' — only
    CHAOS_FAIL_SMS CHAOS_FAIL_LIVEKIT are allowed`, rc=2.
  - `backend-chaos` with no arg -> usage, rc=2.
  - `backend-chaos CHAOS_FAIL_SMS` with no buildable backend -> `BLOCKED: backend
    restart failed (see /tmp/chaos-backend-restart.log); the drill cannot prove
    anything`, rc=1 (no silent pass; no stray `dist/main.js` process left).
  - `status` on this macOS host -> `backend CHAOS_FAIL_SMS: UNKNOWN (no backend
    process or no env introspection)` — i.e. `ps eww` is accepted by the kernel
    but prints no environment, which the script reports as UNKNOWN instead of a
    false "absent" (that distinction decides whether the LiveKit drill runs).
  - the new field-parsing logic exercised against 4 synthetic
    `chaos_ctrl` outputs: new pid set + `env_state=set` -> drill runs; new pid set
    + `unknown` -> SMS drill runs (marker proves it), LiveKit drill SKIPs; same
    pid set -> drill refused; non-zero exit -> refused.
- F6 regex: `تم التحديث منذ 5 دقائق` old=True/**new=False**;
  `Record updated 3 hours ago` old=True/**new=False**; `Chicago ago`
  old=True/**new=False**; `آخر تحديث: 12:30` True/True;
  `Last updated: 12:30` True/True; `آخر تحديثاً 12:30` True/True.
- F7 guard logic executed against 5 candidate bases:
  `staging.nabd.plus` allowed, `api.nabd.plus` REFUSED,
  `user:pw@api.nabd.plus` REFUSED, `api.nabd.plus:443` REFUSED,
  `127.0.0.1` allowed.
- F8 guard: empty parse -> `GUARD_FIRES: BLOCKED: device matrix parsed to an EMPTY
  device matrix`; the committed matrix -> `GUARD_SILENT: real matrix has 5 rows`
  (redfin, bluejay, panther, gts8uwifi, dm1q).
- F9: the extracted step body `bash -n` -> `SH_OK schemathesis doubles step`; its
  readiness probe executed with both ports closed -> `DOUBLE NOT UP: smtp_sink on
  :2525 ([Errno 61] Connection refused) — the backend would 5xx on every
  mail/payment call`, rc=1.
- F10: `--json` support probed on the installed cli — `eas update --help` shows
  `--json  Enable JSON output, non-JSON messages will be printed to stderr`, and
  `eas update:republish --help` plus `update:list`/`channel:edit`/`channel:view`
  all exist (eas-cli/19.1.0). The group-id parser was extracted from the script
  and run over 6 fixtures: `{"id":"<uuid>"}`, `{"data":{"updateGroup":{"groupId":…}}}`,
  `{"updateGroups":[{"group":…}]}` -> uuid; `{"id":"not-a-uuid"}` and a payload
  without an id -> rc=4; non-JSON text -> rc=3. The legacy text parser matched
  `group <uuid>` and rejected an unrelated uuid. End-to-end runs against a stub
  `eas` on PATH: json mode rc=0 (`via --json`), text mode rc=0 (`via text output`),
  an unknown output shape rc=1 with `FORMAT MISMATCH: no update group id could be
  read out of the 'eas update' output`, a failing publish rc=1 with `eas update
  FAILED (rc=1)`. `rollback.sh` against the stub: success rc=0 `rolled
  production-full back to group abc-123`; republish rc=3 -> rc=1 with
  `!! AUTOMATED ROLLBACK FAILED (rc=3)` and no success line; no republish -> rc=1
  with `!! MANUAL ROLLBACK REQUIRED` + runbook; no republish + a missing runbook
  verb -> rc=1 with `!! The manual runbook cannot be executed as written: this
  eas-cli is missing channel:view`.
- F12 locator compared on 4 realistic notification rows: `bid in str(n)` matched 3
  (including a row that only mentions the id in its body text); the exact
  `action.route` match returns the 2 real lab rows.

### No-weakening proof for this round

- Every pre-existing `step(...)` name that existed at `1f8681f` still exists at
  HEAD (checked mechanically per file: `j_killswitches` 8/8, `j_chaos` all,
  `j_throttled_network` 12/12, `j_rapid_tap` 13/13, `j_app_killed_payment` 12/12).
  One accidental cosmetic rename was caught by that check and reverted in
  `e108ea81`.
- Every changed condition is the old condition PLUS a term (`status < 500`,
  `and g3_applied`, `and bool(v_id) and bool(v2_id) and v2_id == v_id`,
  `and not vanished and not drifted`). No assertion was deleted, relaxed or
  renamed to make a check pass.
- The F1 baseline step was MOVED (not rewritten): same name, same `not missing`
  assertion, now evaluated against a pre-write snapshot.

### Still honest-failing / residual risk (not fixed here, by design)

- The patient-web offline banner + `آخر تحديث`/`Last updated` steps still FAIL
  until the 15.4 client work lands — and F6 made that failure sharper, since a
  bare relative timestamp no longer counts as "last updated".
- The LiveKit server-side drill requires the switch to be PROVABLE on the new
  backend process. On a host with no environment introspection (macOS
  `ps eww` prints nothing) it SKIPs with that exact reason; on Linux CI
  (`/proc/<pid>/environ`) it runs.
- The SMS/LiveKit drills restart the backend mid-journey. If the restart fails,
  the drill FAILs loudly and the backend is left down — visible, never silent —
  rather than asserting a fallback against a healthy server.
- `.github/workflows/p15-web-browsers.yml` now depends on a reachable staging
  host (see F7). Device farm, EAS OTA and the whole live gate remain unrunnable
  here: no docker, no GCP project, no Expo account.
