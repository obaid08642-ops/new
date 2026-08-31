import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

import { generateMetadata as doctorsMetadata } from "./consultations/doctors/page";
import { generateMetadata as labsMetadata } from "./diagnostics/labs/page";
import { generateMetadata as radiologyMetadata } from "./diagnostics/radiology/page";
import { generateMetadata as nursingCatalogMetadata } from "./nursing/catalog/page";

function langsFor(path: string) {
  return {
    ar: `https://nabd.plus/ar${path}`, en: `https://nabd.plus/en${path}`, ur: `https://nabd.plus/ur${path}`,
    hi: `https://nabd.plus/hi${path}`, bn: `https://nabd.plus/bn${path}`, fil: `https://nabd.plus/fil${path}`,
    "x-default": `https://nabd.plus/ar${path}`,
  };
}

describe("public page metadata contracts", () => {
  const cases: Array<[string, ({ params }: { params: Promise<{ locale: string }> }) => Promise<any>, string]> = [
    ["doctors listing", doctorsMetadata, "/consultations/doctors"],
    ["labs listing", labsMetadata, "/diagnostics/labs"],
    ["radiology listing", radiologyMetadata, "/diagnostics/radiology"],
    ["nursing catalog", nursingCatalogMetadata, "/nursing/catalog"],
  ];

  for (const [name, fn, path] of cases) {
    it(`publishes indexable, canonical, localized metadata for ${name}`, async () => {
      const meta = await fn({ params: Promise.resolve({ locale: "en" }) });
      expect(meta.robots).toEqual({ index: true, follow: true });
      expect(meta.alternates?.canonical).toBe(`https://nabd.plus/en${path}`);
      expect(meta.alternates?.languages).toMatchObject(langsFor(path));
      expect(meta.openGraph?.url).toBe(`https://nabd.plus/en${path}`);
      expect(meta.twitter?.card).toBe("summary");
    });
  }

  it("returns empty metadata for unsupported locales", async () => {
    const meta = await doctorsMetadata({ params: Promise.resolve({ locale: "xx" }) });
    expect(meta).toEqual({});
  });
});
