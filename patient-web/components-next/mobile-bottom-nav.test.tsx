import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MobileBottomNav } from "./mobile-bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ar/consultations/doctors",
}));

describe("MobileBottomNav", () => {
  it("renders all 5 core navigation items with localized labels and identifies active item", () => {
    const html = renderToStaticMarkup(
      <MobileBottomNav
        locale="ar"
        labels={{
          home: "الرئيسية",
          doctors: "الأطباء",
          pharmacy: "الصيدلية",
          diagnostics: "التحاليل",
          account: "حسابي",
        }}
      />
    );

    expect(html).toContain('href="/ar"');
    expect(html).toContain('href="/ar/consultations/doctors"');
    expect(html).toContain('href="/ar/c"');
    expect(html).toContain('href="/ar/diagnostics/labs"');
    expect(html).toContain('href="/ar/dashboard"');
    expect(html).toContain("الرئيسية");
    expect(html).toContain("الأطباء");
    expect(html).toContain("الصيدلية");
    expect(html).toContain("التحاليل");
    expect(html).toContain("حسابي");
    expect(html).toContain('aria-current="page"');
  });
});
