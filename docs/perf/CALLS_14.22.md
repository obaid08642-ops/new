# Calls (P14.22)

| Plan bullet | State |
|---|---|
| LiveKit and coturn on their own server | Runbook: `deploy/SCALING.md` step 2.6 (TURN on TLS 443 there). Switch at the step-2 trigger. |
| Simulcast, dynacast, adaptive stream | patient-app and provider-app had them; **the web call room did not** (a plain `new Room()`). Now the same settings (`lib/consult/call-resilience.ts`: adaptive stream, dynacast, simulcast 180p/360p over 720p capture, speech audio with DTX), checked against patient-app's source by `tests/call-resilience.test.ts`. |
| Audio-only fallback, then chat | Web call room: two "poor" connection reports in a row (LiveKit sends about one every 2 s) turn video off both ways (camera unpublished, the other side's video unsubscribed), sound kept, with "Try video again"; a call that drops without the patient leaving shows "The call was cut off" with **Continue in chat** (the appointment's chat; `POST /calls/:id/join` now also answers `appointment_id`). Six languages (`ConsultWeb.call*`). |
| TURN over TLS 443 | The TURNS port is a setting: `COTURN_TLS_PORT` (5349 by default; 443 on the calls server). On the shared server 443 is nginx's, so it stays 5349 until step 2. |
| Per-node capacity (LiveKit load tester) | Measured below with `lk load-test` (`tools/perf/livekit/ladder.sh`). |
| LiveKit Cloud as overflow | Owner decision (cost); not built. |

## Per-node capacity (measured)
`tools/perf/livekit/ladder.sh` with livekit-cli 2.5.4, against the local LiveKit 1.10.1 dev server. A 1:1 consultation is one
room with 2 video publishers (720p simulcast, as the apps publish) and 1 subscriber taking both tracks (the same
forwarding work as two people watching each other). 40 s per step, all rooms at once. **The load testers run on the same
4 vCPU machine as LiveKit**, so these are lower bounds for a dedicated calls server.

| Concurrent calls | LiveKit CPU avg / max (% of one core) | Subscriber bitrate (total) | Packet loss | Tracks received |
|---|---|---|---|---|
| 5 | 17 / 36 | 9.3 Mbps | 0.00% | 10/10 |
| 10 | 31 / 61 | 18.6 Mbps | 0.00% | 20/20 |
| 20 | 50 / 103 | 36.8 Mbps | 0.00% | 40/40 |
| 40 | 70 / 124 | 73.2 Mbps | 0.00% | 80/80 |
| 80 | 95 / 124 | 78.7 Mbps | 2.14% | 159/160 |
| 120 | 30 / 114 | 44.2 Mbps | 4.75% | 128/240 |

Reading: up to **40 concurrent video consultations** run clean here, with LiveKit at 70% of one core; at 80 the machine is
saturated (the bitrate stops growing, 2% loss) and at 120 the testers themselves can no longer connect. Each clean call
needs about **1.8 Mbps** of egress at the server (two 720p simulcast tracks, adaptive layer). For a dedicated server the
bound is bandwidth before CPU: 1 Gbps of egress ≈ 500 calls by bitrate alone; the real number must come from the same
ladder run from a separate load machine (BLOCKED below).

## Not done here
- **Wi-Fi → 4G switch and a throttled link on a phone** (plan's "Verify"): needs a real device or the device farm (no
  credentials, as in 14.24). The web side is covered by LiveKit's own resume (the room shows "reconnecting" and keeps the
  call) and by the tested switch to audio only; the apps already reconnect with backoff (`livekit-view.tsx`).
- **Dedicated-server capacity:** the ladder run from a second machine against the calls server of step 2.
- **LiveKit Cloud overflow:** owner decision.
