import { NextResponse } from "next/server";

const authMd = `# Nabd Plus agent authentication

## Current access model
Nabd Plus patient APIs are protected. The patient web application uses a server-side BFF and httpOnly session cookies; browser storage and URL parameters must not contain access tokens or passwords.

## Agent access status
No public OAuth/OIDC authorization server, dynamic client registration endpoint, or MCP server is currently enabled for third-party agents. Agents must not attempt to use the patient web login flow as an API authentication flow.

## Public access
Agents may read explicitly public resources listed in:
- https://nabd.plus/.well-known/api-catalog
- https://nabd.plus/.well-known/ai-catalog.json
- https://nabd.plus/.well-known/agent-skills/index.json

## Protected resources
Patient records, orders, appointments, prescriptions, conversations, notifications, family data, reminders, and health information require an authenticated patient session and are not available through this public agent metadata.

## Registration and credentials
There is no public agent registration URI or credential issuance URI at this time. Do not submit credentials, patient passwords, reset tokens, or payment information to automated agents.
`;

export function GET() {
  return new NextResponse(authMd, {
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
