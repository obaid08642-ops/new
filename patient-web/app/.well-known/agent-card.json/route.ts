import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/**
 * A2A Protocol Agent Card (RFC / A2A Protocol Specification)
 * Defines agent identity, supported interfaces, capabilities, and skills.
 */
const agentCard = {
  $schema: "https://a2a-protocol.org/schemas/v1/agent-card.json",
  name: "Nabd Plus AI Health Assistant",
  version: "1.0.0",
  description: "Accredited Saudi digital healthcare discovery and booking agent assistant providing verified medicine search, consultation booking, lab diagnostics, and home nursing services.",
  provider: {
    name: "Nabd Plus",
    url: origin,
  },
  supportedInterfaces: [
    {
      protocol: "https",
      url: `${origin}/api/v1/mcp`,
      transport: "json-rpc",
    },
    {
      protocol: "https",
      url: `${origin}/api/v1/public/ai-catalog`,
      transport: "rest",
    }
  ],
  capabilities: [
    "medicine_search",
    "doctor_search",
    "diagnostics_booking",
    "home_nursing_booking",
    "insurance_verification"
  ],
  skills: [
    {
      id: "urn:air:nabd.plus:skill:medicine-ordering",
      name: "Medicine Ordering and Availability",
      description: "Search 20,990+ SFDA-compliant pharmaceutical products, therapeutic alternatives, and public pricing ceilings.",
      url: `${origin}/agent-skills/ordering/skill.md`
    },
    {
      id: "urn:air:nabd.plus:skill:healthcare-booking",
      name: "Healthcare Service Booking",
      description: "Discover verified doctors, schedule clinic and teleconsultation appointments, and reserve home nursing visits.",
      url: `${origin}/agent-skills/booking/skill.md`
    },
    {
      id: "urn:air:nabd.plus:skill:public-content",
      name: "Public Content Discovery",
      description: "Read published medical articles, healthcare catalogs, and verified clinic network boundaries.",
      url: `${origin}/agent-skills/public-content/skill.md`
    }
  ],
  documentation: `${origin}/auth.md`,
  privacyPolicy: `${origin}/ar/privacy`
} as const;

export function GET() {
  return NextResponse.json(agentCard, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
