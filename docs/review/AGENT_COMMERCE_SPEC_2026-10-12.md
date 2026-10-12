# Agent commerce: AI assistants that recommend, book and order on Nabd Plus

Owner request 2026-10-12. Spec by the lead reviewer. Base `main`. One PR per item (`oc/AC-<n>`), in order.

## 0. Owner rules (binding)

1. **Any AI assistant** (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, and others) can find Nabd Plus, recommend it, and prepare a booking or an order for a signed-in patient.
2. **Prescriptions are never bypassed.** A prescription (Rx) or controlled item is refused to an agent with `RX_VERIFICATION_REQUIRED` and a link to upload a prescription or book a doctor. Only non-prescription (OTC) items can be ordered by an agent.
3. **The patient confirms and pays on Nabd Plus itself** (Moyasar, on our own pages).
   - An agent never holds card data and never completes a payment.
   - No crypto and no agent payment protocol (x402, mpp, USDC). These were removed in #1321; never bring them back.
4. **Pharmacy orders keep the current model.** The request is broadcast to pharmacies, they send offers, and the patient picks one. An agent can send the request and read the offers. Only the patient selects an offer and pays.
5. **Nothing invented.**
   - No default prices, slots, stock or ETAs.
   - Every value comes from the same services the apps use.
   - Every URL in a discovery file must resolve.

## 1. What exists today (read before coding)

| Piece | Where | State |
|---|---|---|
| MCP server: public tools | `backend/src/modules/mcp/` (`POST /api/v1/mcp`, `GET /mcp/tools`, `/mcp/server-card`) | Works. 9 anonymous tools: search medicines, doctors and facilities; details; alternatives; availability; Rx check; `prepare_transaction`. JSON-RPC only, not the MCP Streamable HTTP transport. |
| `prepare_transaction` | `mcp.service.ts` | Links fixed in #1321: product page, `/consultations/book/<id>`, `/labs/<slug>`, `/nursing/catalog`, in the user's locale. It prepares only. |
| WebMCP | `patient-web/components-next/web-mcp-provider.tsx` | 5 read-only tools in the browser. |
| Discovery | `patient-web/app/.well-known/*` (ACP, UCP, agent-card, ai-catalog, api-catalog, openapi, mcp server card), `llms.txt`, `llms-full.txt`, `robots.ts` (AI bots allowed), sitemaps | They exist. Several claims do not match reality (see AC-5). |
| OAuth metadata | `patient-web/app/.well-known/oauth-authorization-server/route.ts` | **Not real OAuth.** It names `/api/auth/login` as `authorization_endpoint` and `/api/auth/session/exchange` as `token_endpoint`, but neither speaks OAuth (no PKCE, no client registration, no consent). MCP clients cannot sign in. |

## 2. Items

### AC-1: OAuth 2.1 authorization server for agents (largest item)

Implement what the MCP authorization spec requires, so ChatGPT and Claude connectors can sign a patient in.

**Server**
- Authorization code with PKCE (S256 only).
- Dynamic client registration (RFC 7591), plus a static allow-list the admin can manage.
- Metadata at `/.well-known/oauth-authorization-server`.
- Protected-resource metadata (RFC 9728) for the MCP resource.
- Token revocation.
- Access tokens: 15 minutes, audience = the MCP resource.
- Refresh tokens: 30 days, rotated on every use.

**Sign-in and consent (patient-web)**
- The patient signs in with the existing OTP or password flow, then sees a consent page: client name, scopes, and "you confirm and pay on Nabd Plus".
- Scopes: `agent:read` (own orders and bookings), `agent:order` (OTC pharmacy requests), `agent:book` (consultation, lab and nursing holds).
- Consent is stored per client and patient.
- The consent page UI is built by the design session from a needs-review entry. The backend serves its data.

**Patient control**
- `GET /patient/agent-connections` and `DELETE /patient/agent-connections/:clientId`.
- Revoking kills all of that client's tokens.
- The UI ("Connected AI apps" in settings) also goes to the design session.

**Metadata**
- Replace the current metadata document with the real endpoints.
- Keep the `agent_auth` block only if every URL in it works.

### AC-2: MCP Streamable HTTP transport

- Serve the MCP 2025-06-18 Streamable HTTP transport at the MCP endpoint:
  - `initialize`, `tools/list`, `tools/call`;
  - `MCP-Protocol-Version` header;
  - JSON responses (SSE optional).
- Keep the current JSON-RPC body shape working: the WebMCP and llms.txt docs point at it.
- Public tools stay anonymous.
- A call to an authenticated tool without a token returns HTTP 401 with a `WWW-Authenticate` header that carries `resource_metadata` (the MCP auth discovery flow).
- Update the server card (`/mcp/server-card` and `/.well-known/mcp/server-card.json`) to list the auth requirement and the scopes.

### AC-3: Authenticated agent tools

Each tool reuses the existing service, with no copies of booking or order logic. Rules for every write tool:
- It requires an `idempotency_key`.
- It writes an audit entry with `actor_type: 'agent'` and `client_id`.
- It is rate-limited per client and per patient.

| Tool | Scope | Behaviour |
|---|---|---|
| `my_orders`, `my_bookings` | `agent:read` | The patient's own items, with status codes and a deep link each. No other patient data. |
| `create_pharmacy_request` (items: `medicine_id` + qty; optional `address_id` from the patient's saved addresses) | `agent:order` | Through `PharmacyOrderService.create` + `submit`. Any Rx or controlled line refuses the whole request with `RX_VERIFICATION_REQUIRED` and the upload and consult links. Returns `order_id`, status and the tracking URL. |
| `list_offers` (order_id) | `agent:read` | `PharmacyOfferService.listForPatient` (live offers; `include_closed` optional). |
| `choose_offer_link` (order_id, offer_id) | `agent:order` | Selects nothing. Returns the patient's offer page URL, where the patient selects and pays. |
| `consultation_slots` (doctor_id, date, mode) | public | The one availability function (#306). Real slots only. |
| `hold_consultation` (doctor_id, slot, mode) | `agent:book` | Through the existing booking service as a pending booking with its normal hold expiry. Returns `booking_id`, `expires_at` and the payment URL (the existing booking payment page). |
| `hold_lab` / `hold_nursing` | `agent:book` | Same pattern through the lab and nursing booking services, with their real slot engine (B-2). |
| `cancel_hold` (booking_id) | `agent:book` | Only an unpaid hold the same client created. |

### AC-4: The pages the agent links to

- Every returned URL opens a real page in the patient's locale.
- A page that needs the patient asks them to sign in, then continues to the same item.
- The URL must not carry a session or token.
- Payment happens only on the existing payment pages.
- `nabdplus://` deep links and universal links open the same screens in the app. Check `apple-app-site-association` and `assetlinks.json` cover these paths.

### AC-5: Truthful discovery files, with a test that keeps them truthful

- Make every file under `patient-web/app/.well-known/`, plus `llms.txt` and `llms-full.txt`, list only real endpoints and real capabilities:
  - UCP and ACP `checkout`: "patient confirms on Nabd Plus", never autonomous;
  - remove any field nothing implements.
- Add `patient-web/tests/ai-discovery-contract.test.ts`:
  - it collects every URL and path from those files;
  - it checks each one against the app routes and the backend routes list, and fails on any URL that does not resolve.

### AC-6: Safety and privacy

- Tool outputs never include another person's data, clinical notes or documents.
- Errors are codes, not stack traces.
- Rate limits: 30 calls per minute per client and patient; write tools 10 per hour per patient.
- An admin view of agent activity: `GET /admin/agent-activity`, with filters by client, patient and tool. Backend only; the UI goes to the design session.

## 3. Acceptance tests

The reviewer writes them before AC-1 starts, in `backend/acceptance/ac-agent/`. Never edit them.

1. A client registers dynamically. PKCE S256 is required, and `plain` is refused.
2. A code exchange without the right verifier fails. The token's audience is the MCP resource.
3. Revoking a connection kills its access and refresh tokens at once.
4. `tools/call` on an authenticated tool without a token returns 401 with a `WWW-Authenticate` header carrying `resource_metadata`.
5. `create_pharmacy_request`:
   - one Rx line refuses the whole request with `RX_VERIFICATION_REQUIRED`;
   - an OTC-only request creates a broadcast order that the patient sees in `/pharmacy/orders`.
6. The same `idempotency_key` twice gives one order.
7. `choose_offer_link` changes nothing on the order.
8. `hold_consultation`:
   - creates a pending booking with the normal hold;
   - an unpaid hold expires as usual;
   - a slot that is not real is refused.
9. An agent token for patient A cannot read or act on patient B's items.
10. Every write leaves an audit entry with `actor_type: 'agent'` and the client id.
11. The AI discovery contract test passes, and no discovery file mentions x402, USDC or a wallet.

## 4. Out of scope (do not build)

- Paying inside the assistant (ACP delegated payment needs Stripe, which Moyasar does not offer).
- Any crypto.
- An agent selecting an offer or confirming a payment.
- Agent access to medical records, prescriptions or reports.

## 5. Gate

Same as every OpenCode PR:
- the gate in `docs/review/OPENCODE_QUEUE.md`;
- `node backend/scripts/run-acceptance.mjs ac-agent` (green for the items done so far);
- the patient-web tests for AC-5.
