import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const index = {
  $schema: "https://agentskills.io/schemas/agent-skills-discovery.schema.json",
  skills: [
    {
      name: "nabd-medicine-ordering",
      type: "agent-skill",
      description: "Search 20,990+ verified pharmaceutical products, therapeutic alternatives, and check SFDA prescription requirements.",
      url: `${origin}/agent-skills/ordering/skill.md`,
      sha256: "ea2011b98ac145f49e7bb396821d3f00122e23652f2070aa5d08226027a29910"
    },
    {
      name: "nabd-healthcare-booking",
      type: "agent-skill",
      description: "Discover verified doctors, check clinic and home nursing consultation availability, and prepare booking sessions.",
      url: `${origin}/agent-skills/booking/skill.md`,
      sha256: "ca87595d2460df6433e8b09337ff1fa6770e5b8dbeaa45037d04f12f0a8d6725"
    },
    {
      name: "nabd-public-content",
      type: "agent-skill",
      description: "Discover public Nabd Plus content without exposing patient data or performing mutations.",
      url: `${origin}/agent-skills/public-content/skill.md`,
      sha256: "da6cb74ae8b354104ad75e2150587aa6193ab9de23987fae8e73b1be1e754a83"
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
