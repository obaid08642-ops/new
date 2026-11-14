import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(__dirname, "..", "..", rel), "utf8");

describe("map page subtitle", () => {
  it("is passed from MapExplorer.subtitle and drawn visibly in the top bar", () => {
    expect(read("app/[locale]/map/page.tsx")).toContain('subtitle: t("subtitle")');
    const client = read("components-next/map-explorer-client.tsx");
    expect(client).toContain("{labels.subtitle}");
    expect(client).toContain('aria-describedby="map-subtitle"');
  });
  it("exists in every locale", () => {
    for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(JSON.parse(read(`messages/${l}.json`)).MapExplorer.subtitle.length).toBeGreaterThan(10);
    }
  });
});
