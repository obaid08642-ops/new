# Provider LiveKitRoomProvider: manual semantic review

## reviewed source

`src/screens/shared/LiveKitRoomProvider.tsx`, lines 1–80, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## confirmed defects

| ID | evidence | defect | production closure |
|---|---|---|---|
| P-CALL-001 | lines 24–28 | video surface states `Video UI requires tracks from hooks. Simplified for demo.` rather than rendering verified participant tracks | implement accessible call UI with local/remote tracks, audio/video state, reconnect/error/end reasons and reduced-data handling; otherwise do not expose video-call capability |
| P-CALL-002 | lines 47–50 | join token failure is swallowed and the UI shows an indefinite spinner at 56; no retry/error/cancel path | provide bounded loading, typed 401/403/404/expired/network state, retry, cancellation and no PHI leakage |
| P-CALL-003 | lines 59–65 | LiveKit URL falls back to `wss://nabdah-livekit.example.com` | placeholder infrastructure target must be removed; production must use server-issued, environment validated URL without insecure fallback |
| P-CALL-004 | lines 17–20 | local `disconnect()` and navigation are the only visible end-call action; no server call/event/audit/booking status update | add server-authorized join/end events, participant/booking ownership, short-lived token and room scope, end reason/audit; verify unauthorized/stranger/expired-token behavior |

The request at line 47 is an anchor, not proof that `/calls/{roomId}/join` exists or grants the correct token. Its controller, actor binding, token TTL, room isolation, refresh policy and backend audit trail need reconciliation.
