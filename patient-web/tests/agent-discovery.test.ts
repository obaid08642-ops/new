import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getApiCatalog } from "@/app/.well-known/api-catalog/route";
import { GET as getArdCatalog } from "@/app/.well-known/ai-catalog.json/route";
import { GET as getSkills } from "@/app/.well-known/agent-skills/index.json/route";
import { GET as getOpenApi } from "@/app/.well-known/openapi.json/route";
import { GET as getAuth } from "@/app/auth.md/route";
import { GET as getSkill } from "@/app/agent-skills/public-content/skill.md/route";
import { GET as getMarkdown } from "@/app/api/agent-markdown/route";

describe("agent discovery public contracts", () => {
  it("returns an RFC 9727 linkset without private endpoints", async () => {
    const response = getApiCatalog();
    expect(response.headers.get("content-type")).toContain("application/linkset+json");
    const body = await response.json();
    expect(body.linkset[0].item.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).toContain("service-desc");
    expect(JSON.stringify(body)).not.toMatch(/orders|appointments|prescriptions|token|password/i);
  });

  it("returns an OpenAPI public subset rather than a private API specification", async () => {
    const response = getOpenApi();
    expect(response.headers.get("content-type")).toContain("application/vnd.oai.openapi+json");
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body["x-nabd-scope"]).toBe("public-catalog-subset");
    expect(body.paths["/nursing/catalog"]).toBeTruthy();
    expect(body.paths["/radiology/services"]).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/orders|appointments|prescriptions|patient records/i);
  });

  it("returns an ARD catalog with URL-only public entries", async () => {
    const response = getArdCatalog();
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body.specVersion).toBeTruthy();
    expect(body.entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of body.entries) {
      expect(entry.id).toMatch(/^urn:air:nabd\.plus:/);
      expect(entry.url).toMatch(/^https:\/\//);
      expect(entry.data).toBeUndefined();
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("publishes a hashed public skill index and truthful auth instructions", async () => {
    const skills = await (await getSkills()).json();
    expect(skills.skills[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    const auth = await (await getAuth()).text();
    expect(auth).toContain("No public OAuth/OIDC authorization server");
    const skill = await (await getSkill()).text();
    expect(skill).toContain("No mutations");
  });

  it("returns markdown with explicit negotiation metadata", async () => {
    const request = new NextRequest("https://nabd.plus/api/agent-markdown?path=%2Fen", { headers: { Accept: "text/markdown" } });
    const response = await getMarkdown(request);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(await response.text()).toContain("Nabd Plus");
  });
});
