import { NextResponse } from "next/server";

const skill = `# Nabd Plus Healthcare Booking Skill (Agent Skill)

## Purpose
Enables authorized AI agents and LLM assistants to discover verified healthcare providers (doctors, clinics, labs, radiology, and home nursing) and prepare idempotent booking requests under Saudi health regulations.

## Capabilities
- **Provider Discovery**: Search verified doctors by specialty, city, neighborhood, and accepted insurance network.
- **Availability Checking**: Inspect available consultation slots and home-visit hours.
- **Transaction Preparation**: Prepare human-in-the-loop booking requests with the provider's reference prices in SAR (service fee, VAT and the binding total are set server-side at booking, never quoted by the agent).

## Security & Regulatory Boundaries
- **No Autonomous Financial Execution**: The AI agent never handles card data and never completes a payment. The patient confirms and pays on Nabd Plus itself (Moyasar, on Nabd Plus pages).
- **Identity & Session**: Patient health records and sensitive clinical information require an authenticated session; never exposed via unauthenticated discovery tools.

## Protocol & Tool References
- MCP Endpoint: https://mcp.nabd.plus/api/v1/mcp
- Tool: check_availability
- Tool: prepare_transaction (type: consultation_booking, lab_booking, nursing_booking)
- Authenticated holds: a signed-in patient's agent (OAuth 2.1, see /auth.md) prepares holds and requests through the MCP agent tools, which return the patient's Nabd Plus page URL (order tracking / booking status) where the patient selects, confirms and pays.
`;

export function GET() {
  return new NextResponse(skill, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
