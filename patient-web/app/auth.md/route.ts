import { NextResponse } from "next/server";

const authMd = `# Auth.md

## Identity & Agent Discovery
Nabd Plus provides standards-compliant discovery metadata for AI agents and automated services operating within Saudi healthcare regulations:
- **OAuth Protected Resource Metadata**: https://nabd.plus/.well-known/oauth-protected-resource
- **OAuth Authorization Server Metadata**: https://nabd.plus/.well-known/oauth-authorization-server
- **Agent Resource Discovery (ARD)**: https://nabd.plus/.well-known/ai-catalog.json
- **A2A Protocol Agent Card**: https://nabd.plus/.well-known/agent-card.json
- **Agent Skills Directory**: https://nabd.plus/.well-known/agent-skills/index.json
- **OpenAPI 3.1 & MPP Specification**: https://nabd.plus/openapi.json

## Access Model & Security Boundary
No public OAuth/OIDC authorization server is exposed for autonomous uncontrolled agent registration; all access requires human-in-the-loop patient confirmation.
Nabd Plus patient health records, active prescriptions, appointments, notifications, orders, and clinical data require authenticated patient sessions using secure, httpOnly cookies and signed bearer tokens. Third-party automated agents must not attempt scraping or bypassing authenticated patient login flows.

## Saudi PDPL & Patient Health Information (PHI) Security Boundary
In compliance with the Saudi Personal Data Protection Law (PDPL), National Health Information Center (NHIC), and Saudi Food and Drug Authority (SFDA):
1. **Strict Authentication Gating**: All Patient Health Information (PHI) — including medical consultations, patient history, active prescriptions, lab reports, vital telemetry, home address records, and personal identifiers — requires explicit patient authorization via OAuth 2.0 signed Bearer tokens or authenticated httpOnly session cookies.
2. **Zero PHI Exposure to Public Crawlers**: Unauthenticated AI bots, web crawlers, and LLM search agents are strictly restricted to public catalog data, pricing ceilings, specialty listings, and licensed service definitions. All /api/ patient trees return 401 Unauthorized without a valid session.
3. **Automated Scraping Prohibition**: Automated scraping of private patient portals or attempting to bypass multi-factor authentication (OTP) is strictly prohibited.

## PCI-DSS & Payment Security Architecture
1. **Hosted Checkout Links Only**: In adherence to PCI-DSS Level 1 security and Saudi Central Bank (SAMA) payment rules, AI agents and client interfaces NEVER ingest, transmit, or store primary account numbers (PAN), credit card credentials, or CVVs.
2. **Hand-Off Mechanism**: All payable actions (telehealth booking, pharmacy order checkout, diagnostic booking, insurance co-pay) dynamically generate a secure, cryptographic, hosted payment session URL (checkoutUrl). The user is safely redirected to licensed payment gateways (Mada, Visa, Mastercard, Apple Pay, Tabby, Tamara) to complete transaction confirmation.

## Agent Registration & Public Capabilities
- **Registration URI**: https://nabd.plus/api/auth/register
- **Supported Identity Types**: email, phone, anonymous
- **Supported Credential Types**: session_cookie, bearer_token, otp
- **Audience**: AI Agents, LLM assistants, and health catalog discovery bots.
- **Public Capabilities**: Agents can query public medicines catalog, licensed services, pricing ceilings, and availability without credentials.

## Responsible AI Usage & Clinical Boundaries
Automated agents must respect SFDA regulations and CCHI guidelines. Autonomous financial execution or clinical diagnoses require human-in-the-loop patient confirmation.
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
