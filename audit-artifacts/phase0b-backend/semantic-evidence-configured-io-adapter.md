# Phase 0B semantic evidence — Configured Socket.IO adapter

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/config/configured-io.adapter.ts:1–17`

`ConfiguredIoAdapter` extends Nest's `IoAdapter`, accepts an `allowedOrigins` value of either `true` or a string array, and overrides `createIOServer` (`6–11`). When the value is `true`, it passes `{origin:true, credentials:true}` to Socket.IO; otherwise it passes the supplied origin array, enables credentials and declares HTTP-like methods (`12–15`). Existing server options are spread before the constructed `cors` object, so the adapter's CORS value overrides any caller-provided CORS option (`15`).

The `true` branch is an arbitrary-origin credentialed configuration and is unsafe if reachable outside an explicitly isolated local environment (`12–14`). This member trusts the constructor argument without validating origin contents, HTTPS/host/port, duplicates, normalization or deployment mode (`7,12–14`). It does not configure or prove handshake authentication, session/cookie CSRF protection, token expiry/revocation, transport restrictions, connection limits, payload limits or per-event authorization (`11–16`).

The declared methods are not a security authorization policy; they are only CORS method metadata and do not cover Socket.IO event names or message permissions (`14`). No integration test proves this adapter is installed by bootstrap, agrees with HTTP CORS, survives proxy behavior or rejects unauthorized origins/connections. No code was changed and no build/test/application operation was performed during this read.
