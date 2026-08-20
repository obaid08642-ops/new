import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));

import { generateMetadata as layoutMetadata } from "./layout";
import { generateMetadata as homeMetadata } from "./page";

describe("indexing metadata boundary", () => {
  it("keeps the locale layout noindex by default", async () => {
    const metadata = await layoutMetadata({ params: Promise.resolve({ locale: "ar" }) });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates?.languages).toEqual({ ar: "/ar", en: "/en", ur: "/ur", hi: "/hi", bn: "/bn", fil: "/fil", "x-default": "/ar" });
  });

  it("allows indexing only for the public home override", async () => {
    const metadata = await homeMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en");
  });
});
