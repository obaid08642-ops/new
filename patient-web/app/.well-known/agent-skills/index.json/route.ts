import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const index = {
  $schema: "https://agentskills.io/schemas/agent-skills-discovery.schema.json",
  skills: [
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
