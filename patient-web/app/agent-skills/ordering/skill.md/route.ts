import { NextResponse } from "next/server";

const skill = `# Nabd Plus Medicine & Pharmacy Ordering Skill (Agent Skill)

## Purpose
Enables AI agents and LLM assistants to search the verified Saudi medicine catalog, check therapeutic alternatives, verify SFDA prescription status, and prepare pharmacy orders with smart geo-broadcast routing.

## Capabilities
- **Medicine Search**: Search verified pharmaceutical products by trade name, active ingredient, or SFDA registration code.
- **Therapeutic Equivalence**: Find alternatives sharing the exact active ingredient, concentration, and dosage form.
- **SFDA Prescription Compliance**: Verify whether a product requires an official medical prescription (requires_prescription).
- **Geo-Broadcast Ordering**: Prepare order requests for dispatch across nearby partner pharmacies (expanding broadcast radius set by the pharmacy policy).

## Strict Regulatory Guardrails
- **Prescription Medicine Blocking**: Prescription-required (Rx) medications CANNOT be ordered autonomously by AI without an uploaded and pharmacist-verified prescription.
- **SFDA Pricing Enforcement**: Medicine prices are strictly governed by the official Saudi Food & Drug Authority ceiling price; price gouging or arbitrary markup is blocked.

## Protocol & Tool References
- MCP Endpoint: https://mcp.nabd.plus/api/v1/mcp
- Tool: check_prescription_required
- Tool: find_alternatives
- Tool: prepare_transaction (type: medicine_order)
- Product Feed: https://api.nabd.plus/api/v1/public/ai-catalog/products
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
