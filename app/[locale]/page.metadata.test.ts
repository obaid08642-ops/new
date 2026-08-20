import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn()
}));

import { generateMetadata } from "./page";

describe("public landing metadata", () => {
  it("publishes canonical and hreflang alternates for all six supported locales", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    const languages = metadata.alternates?.languages;

    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en");
    expect(languages).toMatchObject({
      ar: "https://nabd.plus/ar",
      en: "https://nabd.plus/en",
      ur: "https://nabd.plus/ur",
      hi: "https://nabd.plus/hi",
      bn: "https://nabd.plus/bn",
      fil: "https://nabd.plus/fil",
      "x-default": "https://nabd.plus/ar"
    });
    expect(metadata.openGraph).toMatchObject({ type: "website", url: "https://nabd.plus/en" });
    expect(metadata.twitter).toMatchObject({ card: "summary" });
  });
});
