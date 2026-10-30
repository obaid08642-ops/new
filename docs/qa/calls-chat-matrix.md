# Calls and chat test matrix (lead order 2026-10-30 14:03)

Status key: **PASS** = run and seen to pass on the local stack. **FAIL** = run and failed; the defect is in `calls-chat.md`.
**NOT RUN** = automatable, but no automation built or run yet. **NOT AUTOMATABLE** = needs a real device or a store build.

Run on 2026-10-30 against the local stack (backend :8002, patient web :3000, LiveKit 1.10.1 on :7880, Chromium 153 headless).
No product code was changed.

## Baseline run (what was actually seen)

| Journey | Result | Evidence |
|---|---|---|
| `tools/live/j_web_call.py`, first run | 42/43 steps; the call setup, the doctor's start and check-in all PASS; the last step failed only because the python used had no Playwright | `/tmp/claude-0-scratch/calls_baseline.log` |
| same journey, second run (venv Python, default URL :3100) | stopped at ECONNREFUSED :3100 (the local web is on :3000) | `/tmp/claude-0-scratch/calls_baseline2.log` |
| same journey, third run (`NABD_WEB_JOURNEYS_URL=http://127.0.0.1:3000`) | 33/35; FAIL at "doctor listed" (HTTP 200 but no started video appointment) | `/tmp/claude-0-scratch/calls_baseline3.log` |

The third-run failure is a time-window issue on the test stack, not a product defect: the journey books the doctor's 14:30 UTC
video window, and the run started after that slot had passed. The first run's assertions for the connected call were reached
only because it ran earlier. This must be re-run with a fresh window before any call cell is marked PASS.

## Matrix

| Area | Cell | Status | Reason |
|---|---|---|---|
| Web <-> web, Chromium | video call connects (patient and doctor in one LiveKit room) | NOT RUN | Baseline journey reached the doctor's start step once (run 1) but the connected-call assertions need a valid window; re-run pending |
| Web <-> web, Firefox | video call | NOT RUN | Only Chromium is installed (`/opt/pw-browsers`); Firefox needs `playwright install firefox` on the test runner |
| Web <-> web, WebKit | video call | NOT RUN | Only Chromium is installed; WebKit needs `playwright install webkit` |
| Web <-> app (patient app, provider app) | call connects | NOT AUTOMATABLE (real device) | Native WebRTC on device; Maestro is not installed here and no device farm is attached |
| Audio-only call | connects, no video track | NOT RUN | No audio-only journey exists yet |
| Video call | connects with camera on | NOT RUN (re-run of the baseline pending) | See baseline |
| Network switch mid-call (`context.setOffline(true)` 5 s, then `false`) | same room reconnects | NOT RUN | Not built |
| Throttle to 3G profile | falls back to audio-only | NOT RUN | Not built; `patient-web/acceptance/d-31/slow-network.e2e.ts` exists as a starting point, not yet checked against calls |
| Relay-only ICE (`iceTransportPolicy: 'relay'`) | connects once TURN is enabled | NOT RUN (blocked on a TURN server on the test stack) | No TURN server configured in `tools/live/start-livekit.sh` |
| Two parallel calls | both connect, rooms isolated | NOT RUN | Not built |
| Chat send and receive | message arrives on the other side | NOT RUN | `tools/live/j_chat.py` exists; not run in this sweep |
| Chat offline send, then reconnect | exactly one message (no duplicate) | NOT RUN | Not built |
| Chat seen ticks | read state shown to the sender | NOT RUN | Not built |
| Chat attachment, image and PDF | upload through the quarantine, then visible | NOT RUN | Not built; the scanner double is `tools/live/fake_clamd.py` |
| Push when the receiver is offline | push sent, message stored | NOT RUN | Not built; push is recorded by the SMTP/push doubles only if the journey asserts it |

## Next steps (in order)

1. Re-run `j_web_call.py` against :3000 with a fresh future slot (the journey books the earliest slot; run it with no prior slot on the same doctor).
2. Install Firefox and WebKit for Playwright on the test runner; repeat the video cell in each.
3. Write one Playwright spec for audio-only, network switch, and 3G throttle (reuse `patient-web/acceptance/d-31`).
4. Add a TURN server to the test stack and a relay-only spec (`iceTransportPolicy: 'relay'`).
5. Write chat specs (send/receive, offline send, seen ticks, attachments, push) on top of `tools/live/j_chat.py`.
6. Mobile cells stay NOT AUTOMATABLE until a device or Maestro runner exists.

No PR has been opened for this matrix. It is committed to `qa/e2e-sweep-account` only.
