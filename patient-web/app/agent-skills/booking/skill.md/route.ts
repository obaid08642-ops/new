import { NextResponse } from "next/server";

const skill = `# Nabd Plus Healthcare Booking Skill (Agent Skill)

## Purpose
Enables authorized AI agents and LLM assistants to discover verified healthcare providers (doctors, clinics, labs, radiology, and home nursing) and prepare idempotent booking requests under Saudi health regulations.

## Capabilities
- **Provider Discovery**: Search verified doctors by specialty, city, neighborhood, and accepted insurance network.
- **Availability Checking**: Inspect available consultation slots and home-visit hours.
- **Transaction Preparation**: Generate secure, human-in-the-loop booking sessions with transparent pricing in SAR and 15% VAT.

## Security & Regulatory Boundaries
- **No Autonomous Financial Execution**: The AI agent cannot charge cards or complete transactions without explicit patient confirmation and OTP verification.
- **Strict Idempotency**: All booking requests must provide an idempotency key (UUID v4) to eliminate double-booking risks.
- **Identity & Session**: Patient health records and sensitive clinical information require authenticated JWT session headers; never exposed via unauthenticated discovery tools.

## Protocol & Tool References
- MCP Endpoint: https://api.nabd.plus/api/v1/mcp
- Tool: check_availability
- Tool: prepare_transaction (type: consultation_booking, lab_booking, nursing_booking)
- Checkout Handoff: https://nabd.plus/checkout?session_id={SESSION_ID}
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
