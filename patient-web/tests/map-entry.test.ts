import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapEntryHref, parseMapType } from "@/lib/map/entry";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("providers map entry", () => {
  it("builds the localized address with the type param", () => {
    expect(mapEntryHref("ar")).toBe("/ar/map");
    expect(mapEntryHref("en", "pharmacy")).toBe("/en/map?type=pharmacy");
  });

  it("reads only a known kind", () => {
    expect(parseMapType("lab")).toBe("lab");
    expect(parseMapType(["doctor", "lab"])).toBe("doctor");
    expect(parseMapType("radiology")).toBe("radiology");
    expect(parseMapType("dentist")).toBeNull();
    expect(parseMapType(undefined)).toBeNull();
  });

  it("is offered on Home and the pharmacy, doctors and diagnostics lists with the right type", () => {
    expect(read("components-next/home/home-shell.tsx")).toContain("${base}/map");
    expect(read("app/[locale]/c/[[...category]]/category-view.tsx")).toContain('<MapEntryLink locale={locale} type="pharmacy"');
    expect(read("app/[locale]/consultations/doctors/doctors-view.tsx")).toContain('mapType="doctor"');
    expect(read("app/[locale]/diagnostics/page.tsx")).toContain('mapType="lab"');
    expect(read("components-next/consult/consult-page.tsx")).toContain("<MapEntryLink");
  });

  it("the map page reads the param and the explorer starts filtered by it", () => {
    expect(read("app/[locale]/map/page.tsx")).toContain("parseMapType((await searchParams)?.type)");
    expect(read("components-next/map-explorer-client.tsx")).toContain('useState<string>(initialType ?? "all")');
  });
});
