import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale: string }) => {
    const copy = locale === "ar"
      ? { title: "الصفحة غير متاحة", body: "لا يمكن فتح هذا المسار أو أنك لا تملك صلاحية الوصول إليه.", returnHome: "العودة إلى البداية" }
      : { title: "Page unavailable", body: "This route cannot be opened or you do not have permission to access it.", returnHome: "Return home" };
    return (key: keyof typeof copy) => copy[key];
  },
  setRequestLocale: vi.fn(),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: (locale: string) => ["ar", "en", "ur", "hi", "bn", "fil"].includes(locale) }));

import LocaleNotFound from "./not-found";

describe("localized not-found boundary", () => {
  it("renders an Arabic recovery state with a locale-safe home link", async () => {
    const html = renderToStaticMarkup(await LocaleNotFound({ params: Promise.resolve({ locale: "ar" }) }));

    expect(html).toContain("الصفحة غير متاحة");
    expect(html).toContain("العودة إلى البداية");
    expect(html).toContain('href="/ar"');
  });

  it("renders an English recovery state with a locale-safe home link", async () => {
    const html = renderToStaticMarkup(await LocaleNotFound({ params: Promise.resolve({ locale: "en" }) }));

    expect(html).toContain("Page unavailable");
    expect(html).toContain("Return home");
    expect(html).toContain('href="/en"');
  });
});
