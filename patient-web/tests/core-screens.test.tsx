import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
}));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));

import { AppearanceLanguage } from "@/components-next/settings/appearance-language";
import { SwitchList, type SwitchRow } from "@/components-next/settings/switch-list";
import { ResultItem, SearchClient } from "@/app/[locale]/search/search-client";

// Fixture props live in this test only; the shipped pages read the API.
const rows: SwitchRow[] = [
  { id: "categories.appointments", group: "categories", key: "appointments", label: "Appointments", value: true },
  { id: "categories.marketing", group: "categories", key: "marketing", label: "Offers", value: false },
  { id: "channels.email", group: "channels", key: "email", label: "Email", value: false },
];

// The Batch 0 notification-settings screen was split in Batch 12 (merge map section 3): appearance and language are
// `/settings/language`, the switches are `/settings/notifications`. The assertions are the old ones, one per new component.
describe("settings language screen", () => {
  it("draws the board's rows: a segmented appearance and the six languages", () => {
    const html = renderToStaticMarkup(<AppearanceLanguage locale="ar" />);
    expect((html.match(/role="radio"/g) || []).length).toBe(3 + 6); // 3 appearance options + 6 languages
    expect(html).toContain('role="radiogroup"');
    expect(html).not.toContain("style=");
  });
});

describe("notification switches", () => {
  it("draws a named switch per setting", () => {
    const html = renderToStaticMarkup(<SwitchList kind="notifications" label="Notifications" rows={rows} />);
    expect((html.match(/role="switch"/g) || []).length).toBe(3);
    expect(html).toMatch(/role="switch" aria-checked="true" aria-label="Appointments"/);
    expect(html).toMatch(/role="switch" aria-checked="false" aria-label="Offers"/);
    expect(html).not.toContain("style=");
  });
});

describe("search screen", () => {
  it("before a query, offers the sections to browse as links and an h1", () => {
    const html = renderToStaticMarkup(<SearchClient locale="ar" />);
    expect(html).toContain('href="/ar/pharmacy"');
    expect(html).toContain("<h1");
    expect(html).not.toContain("style=");
  });

  it("a result row links to its detail page only when one exists, hides code-like subtitles and zero prices", () => {
    const doctor = renderToStaticMarkup(<ResultItem locale="ar" query="" result={{ id: "doc-1", type: "Doctor", typeEn: "Doctor", name: "Dr S", sub: "Cardiology", price: "150" }} />);
    expect(doctor).toContain('href="/ar/consultations/doctors/doc-1"');
    expect(doctor).toContain("price:150");
    const lab = renderToStaticMarkup(<ResultItem locale="ar" query="" result={{ id: "x", type: "Lab", typeEn: "Lab", name: "CBC", sub: "whole_body", price: "0" }} />);
    expect(lab).not.toContain("<a ");
    expect(lab).not.toContain("whole_body");
    expect(lab).not.toContain("price:");
  });

  it("marks the query inside the name", () => {
    const html = renderToStaticMarkup(<ResultItem locale="en" query="ct" result={{ id: "r", type: "Radiology", typeEn: "Radiology", name: "PET-CT scan" }} />);
    expect(html).toContain("<mark");
  });
});
