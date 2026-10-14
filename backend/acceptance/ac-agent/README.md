# ac-agent: agent commerce acceptance (AC-1 … AC-6)

Spec: `docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md` §3 (cases 1–11). Written before AC-1 starts.
The implementing agent makes these tests pass and may not edit them or `live-server.ts`.

Run: `cd backend && node scripts/run-acceptance.mjs ac-agent`
One item while it is open: `npx jest --config jest.acceptance.config.js acceptance/ac-agent -t "AC-1"`

| Cases | Item | `-t` filter |
|---|---|---|
| 1–4 | AC-1 (OAuth 2.1) + the 401 discovery answer | `AC-1` |
| 5–10 | AC-3 (authenticated tools) | `AC-3` |
| 11 | AC-5 (truthful discovery files) | `AC-5` |

The whole compiled backend runs (`dist/main.js`) on in-memory MongoDB and a local Redis. The
test sets `NABD_PUBLIC_URL` (the patient web: issuer, consent page, the pages agents link to) and
`MCP_PUBLIC_URL` (the host of the MCP endpoint) before the server starts.

## HTTP contract fixed by the tests

Backend (global prefix `/api/v1` unless shown):

| Route | What |
|---|---|
| `GET /.well-known/oauth-authorization-server` (no prefix) | RFC 8414. `issuer` = `NABD_PUBLIC_URL`; `authorization_endpoint` on the patient web (consent page); `token_endpoint`, `registration_endpoint`, `revocation_endpoint` on this backend; `code_challenge_methods_supported` = `["S256"]`; scopes `agent:read`, `agent:order`, `agent:book`. The patient web serves the same document at its own `/.well-known/oauth-authorization-server`. |
| `GET <resource_metadata>` (no prefix; the URL the 401 names) | RFC 9728 for `resource` = `${MCP_PUBLIC_URL}/api/v1/mcp`, `authorization_servers` = `[NABD_PUBLIC_URL]`. |
| `POST /oauth/register` | RFC 7591, public clients (`token_endpoint_auth_method: none`), 201. Redirects: https, or http on loopback. |
| `GET /oauth/authorize?<OAuth params>` | Patient bearer required (401 otherwise). Validates the request (S256 only, registered redirect, known scopes) and returns the consent data: `client { client_id, client_name }`, `scopes`. |
| `POST /oauth/authorize` | Patient bearer. Body: the OAuth params + `decision: approve \| deny`. Returns `{ redirect_to }` with `code` + `state`, or `error=access_denied`. Invalid requests: 400, never a redirect. |
| `POST /oauth/token` (form) | `authorization_code` (PKCE verifier required, code single-use) and `refresh_token` (rotated on every use). Access token: JWT, `aud` = the MCP resource, 900 s, `sub` = patient, `client_id`. Not accepted by the patient API. |
| `POST /oauth/revoke` (form) | RFC 7009; revoking a refresh token ends that grant (its access tokens too). |
| `GET /patient/agent-connections`, `DELETE /patient/agent-connections/:clientId` | The patient's connections; delete revokes every token of that client for that patient at once. |
| `POST /mcp` `tools/call` on an authenticated tool | No/invalid token, or a patient session token: HTTP 401 with `WWW-Authenticate: Bearer resource_metadata="…"`. |

Tool results are read from `result.structuredContent` or the JSON in `result.content[0].text`;
tool errors are a JSON-RPC `error` (code in `error.data.error_code`) or an `isError` result
carrying `error_code`.
