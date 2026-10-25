import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { AddPolicyForm } from "@/components-next/insurance/add-policy-form";
import { CompanyPicker, filterCompanies } from "@/components-next/insurance/company-picker";
import { figuresForClass } from "@/lib/insurance/copay";
import { parseNetworks } from "@/lib/insurance/view";

const companies = [
  { id: "c1", name: "Bupa Arabia" },
  { id: "c2", name: "Tawuniya" },
  { id: "c3", name: "Medgulf" },
];

describe("insurer list is searchable", () => {
  it("narrows by any part of the name, case-insensitively, and shows all when empty", () => {
    expect(filterCompanies(companies, "")).toHaveLength(3);
    expect(filterCompanies(companies, "  tAw ").map((c) => c.id)).toEqual(["c2"]);
    expect(filterCompanies(companies, "ara").map((c) => c.id)).toEqual(["c1"]);
    expect(filterCompanies(companies, "zzz")).toEqual([]);
  });
  it("draws a search box and one pressable choice per insurer, the chosen one pressed", () => {
    const html = renderToStaticMarkup(<CompanyPicker companies={companies} value="c2" onChange={() => {}} label="Insurance company" searchLabel="Search for your insurer" noneLabel="No insurer matches" />);
    expect(html).toContain('type="search"');
    expect(html).toContain("Search for your insurer");
    expect((html.match(/aria-pressed="/g) ?? []).length).toBe(3);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Tawuniya</);
  });
});

describe("an insurer's classes", () => {
  const payload = [
    { code: "class-b", name_ar: "الفئة ب", name_en: "Class B", copay_percent: 10, copay_cap_sar: 200 },
    { code: "tier-1", name_ar: "الأولى", name_en: "Tier 1" },
    { code: "bad", name_ar: "س", name_en: "Bad", copay_percent: 150, copay_cap_sar: -4 },
  ];
  it("are named in Arabic on the Arabic page and in English on every other page", () => {
    expect(parseNetworks(payload, "ar").map((c) => c.name)).toEqual(["الفئة ب", "الأولى", "س"]);
    for (const locale of ["en", "ur", "hi", "bn", "fil"]) expect(parseNetworks(payload, locale).map((c) => c.name)).toEqual(["Class B", "Tier 1", "Bad"]);
  });
  it("carry the catalogue's copay figures only when they are in range", () => {
    const [b, tier, bad] = parseNetworks(payload, "en");
    expect(b).toMatchObject({ copayPercent: 10, copayCapSar: 200 });
    expect(tier.copayPercent).toBeUndefined();
    expect(bad.copayPercent).toBeUndefined();
    expect(bad.copayCapSar).toBeUndefined();
  });
  it("fill the two boxes on choosing, and leave what the patient typed when the class has no figures", () => {
    const [b, tier] = parseNetworks(payload, "en");
    expect(figuresForClass(b, { percent: "", cap: "" })).toEqual({ percent: "10", cap: "200" });
    expect(figuresForClass(b, { percent: "35", cap: "9" })).toEqual({ percent: "10", cap: "200" });
    expect(figuresForClass(tier, { percent: "35", cap: "9" })).toEqual({ percent: "35", cap: "9" });
    expect(figuresForClass({ copayPercent: 20 }, { percent: "", cap: "77" })).toEqual({ percent: "20", cap: "77" });
    expect(figuresForClass(null, { percent: "1", cap: "2" })).toEqual({ percent: "1", cap: "2" });
  });
});

describe("the CHI inquiry link", () => {
  const url = "https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx";
  it("opens the official page in a new tab, without opener or referrer", () => {
    const html = renderToStaticMarkup(<AddPolicyForm companies={companies} locale="en" chiUrl={url} />);
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Check your insurance");
  });
  it("is not drawn when /config gave no address", () => {
    expect(renderToStaticMarkup(<AddPolicyForm companies={companies} locale="en" chiUrl={null} />)).not.toContain("Check your insurance");
    expect(renderToStaticMarkup(<AddPolicyForm companies={companies} locale="en" />)).not.toContain("chi.gov.sa");
  });
});
