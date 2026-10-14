import type * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
  setRequestLocale: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));

import DoctorsSpecialtyCityPage from "../app/[locale]/doctors/[specialty]/[city]/page";
import FacilityCanonicalPage from "../app/[locale]/facility/[slug]/page";
import PharmaciesCityPage from "../app/[locale]/pharmacies/[citySlug]/page";
import PrivacyPage from "../app/[locale]/privacy/page";
import { ChipSet, EntityRow, ServiceCard } from "@/components-next/landing/landing-kit";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { readPublicEntity } from "@/lib/api/public-read";
import { parseLegal } from "@/lib/legal/parse-legal";

/**
 * Batch 13: the public directory and legal pages. What is proved: the policy text is split into headings, paragraphs and
 * bullets; the landing parts draw their data and nothing for an empty list; a page draws what the API answered, a 4xx is a
 * 404 and an outage throws (so the cached copy stays); every landing page has no inline style, no raw colour and no `any`.
 * (That they are static is pinned in tests/landing-static.test.ts.)
 */

const answer = (body: unknown, status = 200) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("parseLegal", () => {
  it("splits headings, paragraphs and bullets", () => {
    expect(parseLegal("# Title\n\nFirst line\nsecond line\n\n• One\n- Two\n\nEnd")).toEqual([
      { kind: "heading", text: "Title" },
      { kind: "paragraph", text: "First line second line" },
      { kind: "bullet", text: "One" },
      { kind: "bullet", text: "Two" },
      { kind: "paragraph", text: "End" },
    ]);
  });
});

describe("landing parts", () => {
  it("draws nothing for an empty chip list and one chip per fact otherwise", () => {
    expect(renderToStaticMarkup(<ChipSet label="L" items={[]} tone="blue" />)).toBe("");
    const html = renderToStaticMarkup(<ChipSet label="Symptoms" items={["Cough", "Fever"]} tone="blue" />);
    expect(html).toContain("Cough");
    expect(html).toContain("Fever");
    expect(html).toContain('aria-label="Symptoms"');
  });

  it("a service card has its name, its facts and one action that is a page link", () => {
    const html = renderToStaticMarkup(<ServiceCard icon="test-tube" tone="mint" title="TEST service" sub="TEST line" chips={["TEST chip"]} actionHref="/en/x" actionLabel="Go" />);
    expect(html).toContain("TEST service");
    expect(html).toContain("TEST chip");
    expect(html).toMatch(/<a [^>]*href="\/en\/x"/);
    expect(html).not.toContain("style=");
  });

  it("an entity row points the caret the way the reader goes", () => {
    expect(renderToStaticMarkup(<EntityRow locale="ar" href="/ar/x" icon="hospital" tone="blue" title="T" />)).toContain("caret-left");
    expect(renderToStaticMarkup(<EntityRow locale="en" href="/en/x" icon="hospital" tone="blue" title="T" />)).toContain("caret-right");
  });
});

describe("the public read", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("returns the body, null for a 4xx, and throws for no answer or a 5xx", async () => {
    answer({ ok: 1 });
    expect(await readPublicEntity("http://x/y", 60)).toEqual({ ok: 1 });
    answer({}, 404);
    expect(await readPublicEntity("http://x/y", 60)).toBeNull();
    answer({}, 503);
    await expect(readPublicEntity("http://x/y", 60)).rejects.toBeInstanceOf(PublicDataUnavailableError);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    await expect(readPublicEntity("http://x/y", 60)).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });
});

describe("pages", () => {
  beforeEach(() => vi.unstubAllGlobals());
  const props = { params: Promise.resolve({ locale: "en", specialty: "cardiology", city: "riyadh" }) };

  it("a doctors page links each TEST doctor and facility to its own page and draws no invented rating", async () => {
    answer({
      total_doctors: 1,
      total_facilities: 1,
      doctors: [{ id: "d1", slug: "test-doctor", name_en: "TEST Doctor", specialty: "cardiology", city: "riyadh" }],
      facilities: [{ id: "f1", slug: "test-clinic", name_en: "TEST Clinic", city: "riyadh", district: "TEST district" }],
    });
    const html = renderToStaticMarkup(await DoctorsSpecialtyCityPage(props));
    expect(html).toContain('href="/en/doctor/test-doctor"');
    expect(html).toContain('href="/en/facility/test-clinic"');
    expect(html).toContain("TEST Doctor");
    expect(html).not.toContain("4.9");
  });

  it("a page with nobody listed is a 404, and an outage throws instead of caching an empty page", async () => {
    answer({ total_doctors: 0, total_facilities: 0, doctors: [], facilities: [] });
    await expect(DoctorsSpecialtyCityPage(props)).rejects.toThrow("NEXT_NOT_FOUND");
    answer({}, 503);
    await expect(DoctorsSpecialtyCityPage(props)).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("a facility page draws its facts and chips from the answer, and a missing facility is a 404", async () => {
    answer({ entity: { name_en: "TEST Hospital", type: "hospital", city: "TEST city", phone: "+966000000", accepted_insurance: ["TEST insurer"] }, relationships: { departments: ["TEST department"] } });
    const html = renderToStaticMarkup(await FacilityCanonicalPage({ params: Promise.resolve({ locale: "en", slug: "test-hospital" }) }));
    expect(html).toContain("TEST Hospital");
    expect(html).toContain("TEST department");
    expect(html).toContain("TEST insurer");
    answer({}, 404);
    await expect(FacilityCanonicalPage({ params: Promise.resolve({ locale: "en", slug: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the pharmacies page says nothing about stock: the order goes to nearby pharmacies, which answer with offers", async () => {
    answer({ facilities: [{ id: "p1", name_en: "TEST Pharmacy", city: "TEST city" }] });
    const html = renderToStaticMarkup(await PharmaciesCityPage({ params: Promise.resolve({ locale: "en", citySlug: "riyadh" }) }));
    expect(html).toContain("TEST Pharmacy");
    expect(html).toContain("pharmacies.notice");
    expect(html).not.toMatch(/stock/i);
  });

  it("the privacy page draws the policy of the legal service with its version", async () => {
    answer({ content: "# TEST heading\n\nTEST text\n\n• TEST point", version: "3", effective_date: "2026-01-05T00:00:00Z" });
    // the page returns the async server component of the document: resolve it the way the server does
    const element = (await PrivacyPage({ params: Promise.resolve({ locale: "en" }) })) as { type: (p: unknown) => Promise<React.ReactElement>; props: unknown };
    const html = renderToStaticMarkup(await element.type(element.props));
    expect(html).toContain("TEST heading");
    expect(html).toContain("TEST text");
    expect(html).toContain("TEST point");
    expect(html).toContain("legal.version:3,");
    answer({}, 404);
    await expect(PrivacyPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("the 13 landing pages stay clean", () => {
  const PAGES = [
    "condition/[slug]",
    "doctor/[slug]/[city]",
    "doctors/[specialty]/[city]",
    "doctors/[specialty]/[city]/[neighborhood]",
    "facility/[slug]",
    "home-nursing/[citySlug]",
    "labs/[testSlug]/[citySlug]",
    "radiology/[serviceSlug]/[citySlug]",
    "services/[serviceSlug]/[citySlug]",
    "pharmacies/[citySlug]",
    "privacy",
    "terms",
    "provider-info",
  ].map((p) => `app/[locale]/${p}/page.tsx`);

  it.each(PAGES)("%s: no request reads, no inline style, no raw colour, no any", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|searchParams|no-store/);
    expect(src).not.toContain("style=");
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b|rgba?\(/);
    expect(src).not.toMatch(/: any\b|as any\b|<any>/);
  });

  it("the landing frame and the legal document read no request and carry no inline style", () => {
    for (const file of ["components-next/landing/landing-kit.tsx", "components-next/landing/legal-document.tsx"]) {
      const src = read(file);
      expect(src).not.toMatch(/\bcookies\(|\bheaders\(|style=/);
    }
  });
});
