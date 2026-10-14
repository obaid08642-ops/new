import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AC-5 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md): discovery files list only real
 * endpoints and real capabilities. Static truthfulness the URL contract test cannot see:
 * no capability nothing implements, no invented numbers, no URLs to pages that do not
 * exist, no autonomous-checkout or crypto anywhere.
 */
const WEB = join(__dirname, "..");
const read = (p: string) => readFileSync(join(WEB, p), "utf8");

describe("agent commerce discovery truthfulness (AC-5)", () => {
  it("the MCP server card claims no resources capability (only tools exist)", () => {
    expect(read("app/.well-known/mcp/server-card.json/route.ts")).toContain("resources: false");
    const backend = read("../backend/src/modules/mcp/mcp.service.ts");
    expect(backend).toContain("resources: false");
    expect(backend).not.toMatch(/resources:\s*true/);
  });

  it("no discovery file invents a catalogue count", () => {
    for (const f of [
      "app/.well-known/agent-card.json/route.ts",
      "app/.well-known/agent-skills/index.json/route.ts",
      "app/agent-skills/ordering/skill.md/route.ts",
    ]) {
      expect(`${f}: ${read(f)}`).not.toMatch(/20,?990/);
    }
  });

  it("no discovery file claims agent insurance verification (no such tool exists)", () => {
    expect(read("app/.well-known/agent-card.json/route.ts")).not.toContain("insurance_verification");
  });

  it("the booking skill promises no VAT total, no OTP payment, and no broken checkout URL", () => {
    const skill = read("app/agent-skills/booking/skill.md/route.ts");
    expect(skill).not.toMatch(/15% VAT/);
    expect(skill).not.toMatch(/OTP verification/);
    expect(skill).not.toMatch(/nabd\.plus\/checkout\?/);
    expect(skill).toContain("https://mcp.nabd.plus/api/v1/mcp");
  });

  it("the ordering skill names the real endpoint, field and flow", () => {
    const skill = read("app/agent-skills/ordering/skill.md/route.ts");
    expect(skill).toContain("https://mcp.nabd.plus/api/v1/mcp");
    expect(skill).not.toContain("https://api.nabd.plus/api/v1/mcp");
    expect(skill).not.toMatch(/is_prescription_required/);
    expect(skill).not.toMatch(/3-8 km/);
  });

  it("no unimplemented signature directory is advertised (nothing verifies those keys)", () => {
    expect(existsSync(join(WEB, "app/.well-known/http-message-signatures-directory"))).toBe(false);
  });

  it("no discovery file mentions x402, USDC or a wallet", () => {
    for (const f of [
      "app/.well-known/acp.json/route.ts",
      "app/.well-known/ucp/route.ts",
      "app/.well-known/agent-card.json/route.ts",
      "app/.well-known/ai-catalog.json/route.ts",
      "app/llms.txt/route.ts",
      "app/llms-full.txt/route.ts",
      "app/auth.md/route.ts",
      "app/agent-skills/ordering/skill.md/route.ts",
      "app/agent-skills/booking/skill.md/route.ts",
      "app/agent-skills/public-content/skill.md/route.ts",
    ]) {
      expect(`${f}: ${read(f)}`).not.toMatch(/x402|usdc|\bwallet\b/i);
    }
  });
});
