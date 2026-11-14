# Connecting AI assistants to Nabd Plus (MCP)

Nabd Plus runs a remote MCP server. An assistant can search doctors, medicines, labs, radiology and nursing, put an order or booking on hold for the signed-in patient, and hand back a Nabd checkout link. **The patient always confirms and pays on Nabd Plus. The assistant never pays, never selects a pharmacy offer, and never orders a prescription or controlled medicine.**

| | |
|---|---|
| MCP endpoint (Streamable HTTP, JSON responses) | `https://mcp.nabd.plus/api/v1/mcp` |
| Server card | `https://nabd.plus/.well-known/mcp/server-card.json` |
| Protected-resource metadata (RFC 9728) | `https://mcp.nabd.plus/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/api/v1/mcp` (also served under `/api/v1/mcp/.well-known/...`) |
| Authorization-server metadata (RFC 8414) | `https://nabd.plus/.well-known/oauth-authorization-server` |
| Sign-in | OAuth 2.1 authorization code + PKCE (S256), dynamic client registration at `https://mcp.nabd.plus/api/v1/oauth/register`, public clients (`none`), refresh tokens |
| Scopes | `agent:read` (own orders and bookings), `agent:order` (pharmacy request), `agent:book` (holds) |

## Tools

Public (no sign-in): `search_entities`, `get_entity_detail`, `find_alternatives`, `check_availability`, `prepare_transaction`, `check_prescription_required`, `search_medicines`, `search_doctors`, `search_facilities`, `consultation_slots`.

Signed-in (a call without a token answers HTTP 401 with `WWW-Authenticate: Bearer resource_metadata=...`, which starts the sign-in):

| Tool | Scope | What it does | Returns |
|---|---|---|---|
| `create_pharmacy_request` | `agent:order` | Cart of OTC medicines (`items: [{medicine_id, qty}]`). Any Rx or controlled line refuses the whole cart. Pharmacies answer with offers | `order_id`, `checkout_url` |
| `list_offers`, `choose_offer_link` | `agent:order` / `agent:read` | Read offers; link to the page where the patient picks one | `url` |
| `hold_consultation` | `agent:book` | Holds a real slot for 10 minutes | `booking_id`, `checkout_url` |
| `hold_lab` | `agent:book` | Lab booking, unpaid | `booking_id`, `checkout_url` |
| `hold_radiology` | `agent:book` | Radiology scan at a centre that performs it, unpaid | `booking_id`, `checkout_url` |
| `hold_nursing` | `agent:book` | Home-nursing visit, unpaid | `booking_id`, `checkout_url` |
| `cancel_hold` | `agent:book` | Cancels an unpaid hold this assistant created | `status` |
| `my_orders`, `my_bookings` | `agent:read` | The patient's own records | lists |

Every write tool requires an `idempotency_key`; a retry with the same key returns the same result and creates nothing twice. Limits: 30 calls per minute per client and patient, 10 writes per hour per patient.

## Setup per assistant — what works today

We have tested the server with our own MCP client test in CI (`backend/src/modules/mcp/mcp.client-flow.spec.ts`: initialize, tools/list, 401 discovery, metadata, each hold, checkout link). We have **not** verified a live session in each vendor's app; the notes below say what each vendor documents.

### Claude (claude.ai, Claude desktop and mobile)
Settings → Connectors → Add custom connector → URL `https://mcp.nabd.plus/api/v1/mcp`. Claude follows the 401 pointer, registers itself, and opens the Nabd sign-in and consent page. Remote MCP with OAuth is supported by Claude today (plan availability is Anthropic's to set). Works: all tools above.

### ChatGPT
Settings → Connectors → Advanced → Developer mode → Add a remote MCP server → URL `https://mcp.nabd.plus/api/v1/mcp`, authentication OAuth. Custom MCP connectors are available to ChatGPT plans OpenAI names in its docs and are in beta; some plans can only use read-style tools. Treat ordering from ChatGPT as supported where your plan allows custom connectors with write actions; otherwise the assistant can search and link to Nabd pages.

### Gemini
The consumer Gemini app does not offer adding a remote MCP server today, so a patient cannot order through Gemini chat. Gemini CLI, the Gemini API and ADK accept remote MCP servers: point them at `https://mcp.nabd.plus/api/v1/mcp` (Streamable HTTP; OAuth is handled by the client). Gemini and Google AI Mode still discover Nabd through search, the sitemap and structured data, and open our pages and app links.

### Perplexity and others
Any MCP client that supports Streamable HTTP and OAuth dynamic client registration can connect with the same URL. Clients without MCP still read `https://nabd.plus/llms.txt` and the public pages.

## What the owner must know
- Production must route `mcp.nabd.plus/.well-known/*` to the backend (`deploy/nginx/conf.d/mcp.conf`). If a stale nginx is deployed, the metadata is still served at `https://mcp.nabd.plus/api/v1/mcp/.well-known/oauth-protected-resource`.
- Nothing here takes payment. Payment stays on Nabd Plus pages (Moyasar).
