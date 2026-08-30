import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({
  isLocale: () => true,
  locales: ["ar", "en", "ur", "hi", "bn", "fil"],
}));

import MedicineDetailPage, { generateMetadata } from "./page";

const params = Promise.resolve({ locale: "en", medicineId: "published-medicine" });

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status })));
}

describe("legacy medicine detail URL", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("permanently redirects to the canonical v14 product URL", async () => {
    mockFetch({ slug: "abilify-aripiprazole-15-mg-28-tablets" });
    try {
      await MedicineDetailPage({ params });
      expect.unreachable("redirect should throw");
    } catch (error) {
      expect(String((error as { digest?: string }).digest)).toContain("NEXT_REDIRECT");
      expect(String((error as { digest?: string }).digest)).toContain("/en/p/abilify-aripiprazole-15-mg-28-tablets");
    }
  });

  it("keeps the legacy URL noindex and points canonical at the v14 product page", async () => {
    mockFetch({ slug: "abilify-aripiprazole-15-mg-28-tablets" });
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en/p/abilify-aripiprazole-15-mg-28-tablets");
  });

  it("returns noindex-only metadata when the product is not public", async () => {
    mockFetch({}, 404);
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
