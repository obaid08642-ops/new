# AI-agent discovery implementation

## Implemented in the web repository

The following public, non-patient discovery surfaces were implemented:

| Surface | Route | Status |
|---|---|---|
| RFC 9727 API Catalog | `/.well-known/api-catalog` | Implemented as `application/linkset+json` with public nursing/radiology items, `service-desc`, `service-doc`, status links, and HEAD Link metadata. |
| OpenAPI subset | `/.well-known/openapi.json` | Implemented for the confirmed public catalog subset only; it is explicitly not the private patient API specification. |
| ARD | `/.well-known/ai-catalog.json` | Implemented with public URL entries, URNs, media types, and representative queries. |
| Agent Skills | `/.well-known/agent-skills/index.json` | Implemented with a SHA-256-pinned public-content skill. |
| Skill document | `/agent-skills/public-content/skill.md` | Implemented as read-only public-content guidance with no mutation capability. |
| Auth.md | `/auth.md` | Implemented with truthful cookie/BFF boundaries and explicit statement that public OAuth/OIDC agent registration is not enabled. |
| Markdown negotiation | `Accept: text/markdown` on `/`, `/ar`, `/en`, `/ar/articles`, `/en/articles` | Implemented through the proxy and `/api/agent-markdown`; default HTML behavior is preserved, with `Content-Type: text/markdown` and `Vary: Accept`. |

## Explicitly not enabled

DNS-AID records cannot be published from this web repository. They require authoritative DNS-provider access, SVCB/HTTPS record support, and DNSSEC signing. No DNS change was attempted.

OAuth/OIDC authorization-server metadata, OAuth Protected Resource Metadata, MCP Server Card, and WebMCP tools were not fabricated. The current patient web application uses an httpOnly-cookie BFF rather than a public OAuth authorization server or public MCP transport. Publishing invented issuer, token, JWKS, registration, MCP, or browser-tool endpoints would be misleading and unsafe. These remain blocked until the owner provides the actual authorization server/MCP/WebMCP contracts and deployment configuration.

## Verification

The discovery-specific tests and the full project gates pass after implementation:

- 142 test files passed.
- 290 tests passed.
- 23 tests skipped.
- TypeScript check passed.
- Production build passed.
- `git diff --check` passed.

The code is not production-live until the deployment owner publishes the resulting commit and the public routes are probed on `https://nabd.plus`.

## Local production-build smoke

After the production build, `next start -p 3100` was started locally and the following checks passed: API Catalog `200 application/linkset+json`; OpenAPI subset `200 application/vnd.oai.openapi+json`; ARD and Agent Skills index `200 application/json` with CORS; `/auth.md` and the skill document `200 text/markdown`; API Catalog HEAD included the `rel="api-catalog"` Link header; and `Accept: text/markdown` on `/en` returned `200 text/markdown` with `Vary: Accept` and `X-Markdown-Tokens`.

The first smoke attempt used an invalid `pnpm start -- -p 3100` invocation and failed before starting Next. It was corrected to `pnpm exec next start -p 3100`; the corrected smoke passed. This is recorded to distinguish an operator-command error from an application failure.
