# Phase 0B semantic evidence — LiveKit webhook guard

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/webhooks/guards/livekit-webhook.guard.ts:2–32`

`LiveKitWebhookGuard` constructs the SDK `WebhookReceiver` using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, but falls back to `fake_key` and `fake_secret` when environment values are missing (`livekit-webhook.guard.ts:8–13`). It requires an Authorization header and passes `request.body` plus that header to the SDK receiver; on success it stores the parsed event on the request and returns true, while every exception becomes a generic 401 (`15–30`).

The guard assumes `request.body` is the raw signed payload but does not visibly enforce raw-body capture, content type/size, timestamp tolerance, event nonce/replay deduplication, LiveKit room/participant binding, or secret fail-closed startup behavior. It also relies on the caller/header value being the expected signed credential format; no visible issuer/room/entity authorization is present in this guard.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: predictable fallback webhook credentials, raw-body/signature verification coupling, replay risk, missing event-to-entity authorization, and lack of payload/resource limits.
