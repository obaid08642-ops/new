# Calls at scale (P2P for 1:1, TURN as fallback, LiveKit for groups)

Flag: `CALLS_P2P_ENABLED` (default **off**). With it off, nothing changes: every call is LiveKit.

## Are consultations recorded?
**No.** Nothing in the repository starts a recording or an egress: no `EgressClient`, no `startRoomCompositeEgress`, no
`recording` field on `callsessions` or on the appointment, no LiveKit egress setting in `deploy/livekit/livekit.yaml`; the
LiveKit webhook handler only reads `room_finished`. The server keeps who called whom, when, for how long and the quality
samples, not the media. So P2P loses nothing today. **If the owner decides consultations must be recorded**, a P2P call cannot
be recorded on the server (the media never reaches it): those calls must stay on LiveKit (egress). The switch for that is
one line in `chooseTransport` (`call-transport.ts`), the rest of the design stands.

## How a call is routed
| Call | Transport | Media path |
|---|---|---|
| 1:1 consultation, flag on, both clients declare `supports_p2p` | `p2p` | direct (host / STUN-reflexive candidates); through coturn only if the direct path fails |
| P2P failed (ICE failed, 12 s with no connection) | `livekit` | `POST /calls/:id/fallback` keeps the room and gives a LiveKit token; the other side gets a `call.transport` event |
| Group call, flag off, or a client that does not declare P2P | `livekit` | as today |

The backend, for a P2P call: authorizes the two participants (`initiate`, `join`), hands out STUN + short-lived TURN credentials
(`CoturnService`, HMAC-SHA1 with the shared secret, which never leaves the server), relays `call:sdp_offer`, `call:sdp_answer`,
`call:ice_candidate` (already authorized per session by `authorizeSignaling`) and records the transport and the media path
(`direct`/`relay`) per call. It mints **no LiveKit token** for a P2P call.

A joiner that does not declare `supports_p2p` (an older app) moves the whole call to LiveKit at join, so a flag flip never strands
a call on a client that cannot do it.

## Busy host, audio only
- **Per-host cap:** `CALLS_MAX_PER_HOST` (default 1) calls initiated or active for the same provider; a ringing call counts for 2 minutes,
  an active one for 3 hours (so a crashed client does not block the doctor). The next call is answered `409 { code: "provider_busy", retry_after_seconds: 60 }`;
  re-dialling the same appointment is allowed. Clients show a "the doctor is in another consultation, try again in a minute" message from the code.
- **Audio only, automatically:** `join`/`initiate` answer `audio_only: true` (`audio_only_reason`) when the platform has `CALLS_PRESSURE_ACTIVE`
  (300) active calls; `POST /calls/:id/metrics` answers the same from the last sample (packet loss >= 10 %, round trip >= 600 ms, or < 150 kbps).
  The client engine (`patient-web/lib/consult/p2p-call.ts`) also turns video off after two weak samples in a row. Sound is never touched.

## Numbers
Server egress per call, from the measured LiveKit ladder (`docs/perf/CALLS_14.22.md`): **1.8 Mbps** with simulcast adaptive
(two 720p tracks); at a fixed 1.5 Mbps each way the SFU sends **3 Mbps** per call.

| | Server bandwidth per call | Calls per 1 Gbps of server egress |
|---|---|---|
| LiveKit (SFU), 3 Mbps worst case | 3 Mbps | **≈ 330** (≈ 550 at the measured 1.8 Mbps) |
| P2P, direct | ~0 (signalling is a few KB per call) | not bandwidth-bound |
| P2P through TURN | 3 Mbps in + 3 Mbps out; egress 3 Mbps | ≈ 330 (same as the SFU, without its CPU) |
| P2P with a direct share *d* | (1 − d) × 3 Mbps average | ≈ 330 / (1 − d) |

Expected direct share *d*: WebRTC deployments see roughly 75–90 % of calls connect without a relay; mobile carriers with
carrier-grade NAT (common in the region) push it to the low end. **Assumption, to be measured**: *d* = 0.75 →
average 0.75 Mbps per call → **≈ 1,300 calls per Gbps** (4× LiveKit); at *d* = 0.5 → ≈ 660 per Gbps. The measure is built in:
`GET /calls/admin/analytics` answers `transports_today` (transport × media path × fell back to LiveKit), so the real share comes from the first day with the flag on for a slice of users.

LiveKit CPU is the second limit (70 % of one core at 40 calls on 4 vCPU, `CALLS_14.22.md`); P2P removes it for the direct share, TURN relaying is cheaper than SFU forwarding (no decrypt/forward per subscriber).

## Tested on the local stack
- Backend: `call-transport.spec.ts` (decisions, flag off unchanged, P2P session without a LiveKit token, ICE servers without the secret, busy host 409, unsupported joiner falls back, fallback event, weak-link advice).
- Real browser: two Chromium pages with real `RTCPeerConnection`, signalling over a channel standing in for the gateway, the engine from `patient-web/lib/consult/p2p-call.ts`:
  **connected direct in ~70 ms** (candidate pair host/srflx, `path: direct`); with `iceTransportPolicy: "relay"` and no TURN the engine fell back after its timeout (`fallback: timeout`) on both sides.
- Not tested here: a real coturn relay (no coturn on this machine, no apt access); the relay path is covered by the stats-parsing test with a relay candidate pair.

## Not in this PR (follow-ups, one PR each; flag stays off until they land)
1. Wire the engine into the web call room and the realtime socket (`call:sdp_*`), then patient-app and provider-app (`@livekit/react-native-webrtc` is already a dependency); each declares `supports_p2p: true` only when its wiring ships.
2. Busy / audio-only messages in six languages in the three clients.
3. A rehearsal with real coturn and a phone on mobile data, to replace the assumed direct share.
