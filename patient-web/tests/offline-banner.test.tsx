import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string, values?: Record<string, string>) => (values?.time ? `${key}:${values.time}` : key),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ar" }));

const { OfflineBanner } = await import("@/components-next/network/offline-banner");
const { OfflineBannerView } = await import("@/components-next/network/offline-banner-view");

const root = path.resolve(import.meta.dirname, "..");
const locales = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

describe("offline banner", () => {
  it("shows nothing while online", () => {
    expect(renderToStaticMarkup(<OfflineBannerView online message="x" />)).toBe("");
  });

  it("offline: a polite status with the message, through the shared Toast", () => {
    const html = renderToStaticMarkup(<OfflineBannerView online={false} message="offline since 10:00" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("offline since 10:00");
    expect(html).toContain("nabd-toast--warning");
  });

  it("is absent from the server HTML, so the cached page is the same for everyone", () => {
    expect(renderToStaticMarkup(<OfflineBanner renderedAt={Date.now()} />)).toBe("");
  });

  it("does not pull the Toast (and the icon outlines) into the layout's first load", () => {
    const banner = readFileSync(path.join(root, "components-next/network/offline-banner.tsx"), "utf8");
    expect(banner).not.toMatch(/from "@\/components-next\/ui-generated\/components\/Feedback"/);
    expect(banner).toMatch(/import\("\.\/offline-banner-view"\)/);
    expect(banner).not.toContain("next/dynamic");
  });

  it("is mounted by the locale layout with the layout's render time", () => {
    const layout = readFileSync(path.join(root, "app/[locale]/layout.tsx"), "utf8");
    expect(layout).toMatch(/<OfflineBanner renderedAt=\{Date\.now\(\)\} \/>/);
  });

  it("has real words in all six languages, an offline word and a 'last updated' label with the time", () => {
    const bannerWords: Record<string, RegExp> = {
      ar: /غير متصل/, en: /offline/i, ur: /آف لائن/, hi: /ऑफ़लाइन/, bn: /অফলাইন/, fil: /Offline/,
    };
    const updatedWords: Record<string, RegExp> = {
      ar: /آخر\s*تحديث/, en: /Last\s*updated/, ur: /آخری اپ ڈیٹ/, hi: /अंतिम अपडेट/, bn: /সর্বশেষ হালনাগাদ/, fil: /Huling pagbabago/,
    };
    const english = JSON.parse(readFileSync(path.join(root, "messages/en.json"), "utf8")).Network;
    for (const locale of locales) {
      const network = JSON.parse(readFileSync(path.join(root, `messages/${locale}.json`), "utf8")).Network;
      expect(network.offline, locale).toMatch(bannerWords[locale]);
      expect(network.offlineLastUpdated, locale).toMatch(bannerWords[locale]);
      expect(network.offlineLastUpdated, locale).toMatch(updatedWords[locale]);
      expect(network.offlineLastUpdated, locale).toContain("{time}");
      if (locale !== "en") expect(network.offlineLastUpdated, locale).not.toBe(english.offlineLastUpdated);
    }
  });
});
