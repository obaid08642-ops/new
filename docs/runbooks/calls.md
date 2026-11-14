# Runbook: audio/video calls failing

**Signals:** support reports calls that do not connect or drop; `docs/ops` call checks (`tools/live/turn-relay-check.mjs`, workflow `turn-relay.yml`) fail.

1. Is the API issuing call tokens? Call routes are class `realtime` (never shed by R16). 5xx there = `api-availability.md`.
2. Is LiveKit up? Container health and logs of the LiveKit service on the host; the signalling port and the media UDP range are open (`93-calls-network`, `93b-calls-ports` tasks).
3. Is TURN reachable? `turn-relay-check.mjs`; coturn container; credentials rotation (`35-livekit-rotate` task) can break calls if only one side was updated.
4. Is it the network of the user, not the server? One carrier or one country only = relay/UDP blocking; TURN over TCP/443 is the fallback.
5. Host pressure: CPU saturation on the single host hurts media first. `nabd_event_loop_lag_ms` and host CPU; capacity numbers for self-hosted LiveKit belong to R8.

**Mitigate:** restart only the LiveKit/coturn container, outside a running consultation window if possible; tell support to move affected consultations to chat or reschedule. **Verify:** a test call between two devices on different networks (wifi and mobile data).
