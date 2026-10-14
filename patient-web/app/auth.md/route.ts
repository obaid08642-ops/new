import { NextResponse } from "next/server";

const authMd = `# Auth.md

## Agent sign-in (OAuth 2.1, MCP authorization)
AI assistants sign a patient in with OAuth 2.1 before using the authenticated tools of the Nabd Plus MCP server.
- **Authorization server metadata (RFC 8414)**: https://nabd.plus/.well-known/oauth-authorization-server
- **Protected resource metadata (RFC 9728)**: https://nabd.plus/.well-known/oauth-protected-resource
- **Flow**: authorization code with PKCE (S256 only). Dynamic client registration (RFC 7591) for public clients; token revocation (RFC 7009).
- **Tokens**: access tokens last 15 minutes and are valid only for the MCP resource; refresh tokens last 30 days and rotate on every use.
- **Scopes**: \`agent:read\` (the patient's own orders and bookings), \`agent:order\` (pharmacy requests for non-prescription items), \`agent:book\` (holds for consultation, lab and nursing appointments).
- **Consent**: the patient signs in on Nabd Plus and approves the client and its scopes. The patient can disconnect a client at any time; its tokens stop working at once.

An authenticated MCP tool called without a valid token answers HTTP 401 with \`WWW-Authenticate: Bearer resource_metadata="..."\`. Public tools (search and details) need no sign-in.

## What an agent can and cannot do
- An agent prepares. The patient confirms and pays on Nabd Plus itself; payment is by Moyasar on Nabd Plus pages. An agent never handles card data and never completes a payment.
- Prescription items are never ordered by an agent: they need the patient's prescription or a consultation.
- No agent access to medical records, prescriptions or reports.

## Patient data
Patient records, prescriptions, appointments, orders and messages are private. They are never public content, and the patient web serves them only to the signed-in patient. Automated scraping of private pages or bypassing sign-in (OTP) is not allowed.
`;

export function GET() {
  return new NextResponse(authMd, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
