import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "./helpers/intl";

let activeLocale = "en";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => {
  const helpers = await import("./helpers/intl");
  return { useTranslations: (namespace?: string) => helpers.createTranslator(activeLocale, namespace), useLocale: () => activeLocale };
});
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children, search }: { children: unknown; search?: unknown }) => <>{search}{children}</> }));

import { ResultItem, SearchClient } from "@/app/[locale]/search/search-client";

function inLocale<T>(locale: string, render: () => T): T {
  activeLocale = locale;
  try { return render(); } finally { activeLocale = "en"; }
}

describe("search: doctor sub-line", () => {
  const doctor = (sub: string) => ({ id: "d1", type: "Doctor", typeEn: "Doctor", name: "Dr S", sub });

  it("shows the specialty by its translated name instead of hiding the slug", () => {
    expect(renderToStaticMarkup(<ResultItem locale="en" query="" result={doctor("cardiology")} />)).toContain("Cardiology");
    const ar = inLocale("ar", () => renderToStaticMarkup(<ResultItem locale="ar" query="" result={doctor("cardiology")} />));
    expect(ar).toContain(createTranslator("ar", "SpecialtyNames")("cardiology"));
    const ur = inLocale("ur", () => renderToStaticMarkup(<ResultItem locale="ur" query="" result={doctor("pediatrics")} />));
    expect(ur).toContain(createTranslator("ur", "SpecialtyNames")("pediatrics"));
    expect(ur).not.toContain("pediatrics");
  });

  it("hides a slug it has no name for, and keeps hiding the codes of other kinds", () => {
    expect(renderToStaticMarkup(<ResultItem locale="en" query="" result={doctor("general_medicine")} />)).not.toContain("general_medicine");
    const lab = renderToStaticMarkup(<ResultItem locale="en" query="" result={{ id: "l", type: "Lab", typeEn: "Lab", name: "CBC", sub: "cardiology" }} />);
    expect(lab).not.toContain("Cardiology");
    expect(lab).not.toContain("cardiology");
  });

  it("keeps the fallback words the backend sends for a doctor without a specialty", () => {
    expect(renderToStaticMarkup(<ResultItem locale="en" query="" result={doctor("Doctor")} />)).toContain(">Doctor<");
  });
});

describe("search: the home search box sends ?q=", () => {
  it("starts with the query in the field (the search itself runs in the browser)", () => {
    const html = renderToStaticMarkup(<SearchClient locale="en" initialQuery="panadol" />);
    expect(html).toMatch(/<input[^>]*value="panadol"/);
    expect(html).toContain("Searching");
  });

  it("starts empty, with the sections to browse, without a query", () => {
    const html = renderToStaticMarkup(<SearchClient locale="en" />);
    expect(html).toMatch(/<input[^>]*value=""/);
    expect(html).toContain('href="/en/pharmacy"');
  });
});
