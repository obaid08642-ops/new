# Phase 0B semantic evidence — Legacy Socket Gateway

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/socket/socket.gateway.ts:2–46`

`socket.gateway.ts:6–17` creates a Socket.IO gateway with CORS and only connection/disconnection logging; no handshake JWT/auth guard or namespace policy is visible. `:19–23` accepts arbitrary payloads for `sendMessage`, logs the full JSON and broadcasts it globally as `newMessage`. `:27–37` accepts arbitrary provider/patient identifiers from client messages and joins the corresponding rooms without authentication or participant/relationship checks. `:39–45` emits raw urgent-request/copay payloads to provider/patient rooms. This is a parallel legacy surface beside RealtimeGateway and ChatGateway.

## Findings candidates

The read supports: unauthenticated global message broadcast, arbitrary room subscription/IDOR, raw payload/PII logging and exposure, and duplicate ungoverned WebSocket surfaces with no rate/size/audit/retention contract.

No product code was changed and no tests/builds were executed during this semantic read.
