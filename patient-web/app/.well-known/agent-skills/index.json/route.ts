import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const index = {
  $schema: "https://agentskills.io/schemas/agent-skills-discovery.schema.json",
  // sha256 is the exact GET response body of each skill URL below (recompute when a skill changes).
  skills: [
    {
      name: "nabd-medicine-ordering",
      type: "agent-skill",
      description: "Search verified pharmaceutical products, therapeutic alternatives, and check SFDA prescription requirements.",
      url: `${origin}/agent-skills/ordering/skill.md`,
      sha256: "c78cf436c545aa55cf662dd96aa13b8d929381a68b6fe8667fa982c17c26efaf"
    },
    {
      name: "nabd-healthcare-booking",
      type: "agent-skill",
      description: "Discover verified doctors, check clinic and home nursing consultation availability, and prepare booking sessions.",
      url: `${origin}/agent-skills/booking/skill.md`,
      sha256: "30ef9c19b38d7cb24e03c463d9e8732d9402c681503c7f049f1de8badcc33818"
    },
    {
      name: "nabd-public-content",
      type: "agent-skill",
      description: "Discover public Nabd Plus content without exposing patient data or performing mutations.",
      url: `${origin}/agent-skills/public-content/skill.md`,
      sha256: "ea5ab745cb42f91b5e31d18e2e20ad04517ecba09b03edff06a05242c6f75c7d"
    }
  ]
} as const;

export function GET() {
  return NextResponse.json(index, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
