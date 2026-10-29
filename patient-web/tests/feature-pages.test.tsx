import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/** next-intl answered from the real message files, so the test sees each locale's own text. */
const MESSAGES: Record<string, Record<string, unknown>> = Object.fromEntries(
  ["ar", "en", "ur", "hi", "bn", "fil"].map((l) => [l, JSON.parse(readFileSync(resolve(process.cwd(), `messages/${l}.json`), "utf8"))]),
);
function lookup(locale: string, key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), MESSAGES[locale]);
  if (typeof value !== "string") throw new Error(`missing message ${locale}:${key}`);
  return value;
}
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => (key: string) => lookup(locale, `${namespace}.${key}`),
  setRequestLocale: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));

import FeaturePage, { generateMetadata, generateStaticParams } from "../app/[locale]/features/[feature]/page";
import robots from "@/lib/seo/robots-policy";
import { GET as staticSitemap } from "../app/sitemaps/static.xml/route";
import { GET as llms } from "../app/llms.txt/route";
import { FEATURE_PAGES } from "@/lib/seo/feature-pages";

vi.mock("@/lib/api/public-config-server", () => ({ getDisabledModules: async () => new Set() }));

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
const ORIGIN = "https://nabd.plus";
const props = (locale: string, feature: string) => ({ params: Promise.resolve({ locale, feature }) });
// &amp; last, so an escaped entity such as "&amp;lt;" decodes once, to "&lt;".
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function jsonLd(html: string): Array<Record<string, any>> {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  return blocks.flat();
}

describe("feature pages", () => {
  it("are statically generated for the seven features in the six locales", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(42);
    expect(new Set(params.map((p) => p.feature))).toEqual(new Set(["medication-reminders", "pregnancy", "mental-health", "nutrition", "family", "loyalty", "online-consultations"]));
  });

  for (const feature of FEATURE_PAGES) {
    for (const locale of LOCALES) {
      const text = (key: string) => lookup(locale, `FeaturePages.${feature.key}.${key}`);
      const path = `/features/${feature.slug}`;

      it(`${feature.slug} (${locale}): translated, canonical, indexable metadata`, async () => {
        const meta = await generateMetadata(props(locale, feature.slug));
        expect(meta.title).toBe(text("metaTitle"));
        expect(meta.description).toBe(text("metaDescription"));
        expect(String(meta.description).length).toBeLessThanOrEqual(160);
        if (locale !== "en") {
          expect(meta.title).not.toBe(lookup("en", `FeaturePages.${feature.key}.metaTitle`));
          expect(meta.description).not.toBe(lookup("en", `FeaturePages.${feature.key}.metaDescription`));
        }
        expect(meta.alternates?.canonical).toBe(`${ORIGIN}/${locale}${path}`);
        expect(meta.alternates?.languages).toEqual({
          ...Object.fromEntries(LOCALES.map((l) => [l, `${ORIGIN}/${l}${path}`])),
          "x-default": `${ORIGIN}/ar${path}`,
        });
        expect(meta.robots).toEqual({ index: true, follow: true });
        expect(meta.openGraph).toMatchObject({ url: `${ORIGIN}/${locale}${path}`, title: text("metaTitle") });
        expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
      });

      it(`${feature.slug} (${locale}): H1, direct answer, visible FAQ equal to the JSON-LD, call to action`, async () => {
        const html = decode(renderToStaticMarkup((await FeaturePage(props(locale, feature.slug))) as ReactElement));
        expect(html).toContain(`<h1`);
        expect(html).toMatch(new RegExp(`<h1[^>]*>${text("title").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`));
        expect(html).toContain(`nabd-direct-answer">${text("answer")}</p>`);

        const ld = jsonLd(html);
        const page = ld.find((d) => d["@type"] === "MedicalWebPage");
        expect(page).toMatchObject({ name: text("title"), inLanguage: locale, url: `${ORIGIN}/${locale}${path}`, about: { name: text("title") } });
        expect(page?.speakable?.cssSelector).toContain(".nabd-direct-answer");
        const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList");
        expect(crumbs?.itemListElement.map((i: { item: string }) => i.item)).toEqual([`${ORIGIN}/${locale}`, `${ORIGIN}/${locale}${path}`]);

        const faq = ld.find((d) => d["@type"] === "FAQPage");
        const questions = faq?.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => [q.name, q.acceptedAnswer.text]);
        expect(questions).toHaveLength(feature.faq);
        for (const [q, a] of questions) {
          expect(html).toContain(`>${q}</h3>`);
          expect(html).toContain(`>${a}</p>`);
        }
        expect(questions.map(([q]: [string]) => q)).toEqual(Array.from({ length: feature.faq }, (_, i) => text(`q${i + 1}`)));

        const svc = ld.find((d) => d["@type"] === "Service");
        if (feature.service) {
          expect(svc).toMatchObject({ serviceType: "Online medical consultation", provider: { "@type": "Organization", name: "Nabd Plus" }, areaServed: { name: "Saudi Arabia" } });
          expect(JSON.stringify(svc)).not.toMatch(/price|offers/i);
        } else {
          expect(svc).toBeUndefined();
        }
        expect(html).toContain(`href="/${locale}${feature.cta}"`);
        expect(html).not.toContain("style=");
      });
    }
  }

  it("an unknown feature is a 404 and its metadata is not indexable", async () => {
    await expect(FeaturePage(props("en", "skin-analysis"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(FeaturePage(props("xx", "pregnancy"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect((await generateMetadata(props("en", "leaderboard"))).robots).toEqual({ index: false, follow: false });
  });

  it("the mental health page sends urgent help to the urgent-help screen and writes no phone number", async () => {
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup((await FeaturePage(props(locale, "mental-health"))) as ReactElement);
      expect(html).toContain(`href="/${locale}/emergency"`);
      expect(html).not.toMatch(/tel:|\b99\d\b/);
    }
  });

  it("the mental health page has no Relax (breathing, meditation): deferred for clinical review (#851)", async () => {
    const RELAX: Record<string, RegExp> = {
      ar: /الاسترخاء|التنفس|التأمل/, en: /relax|breathing|meditation/i, ur: /سکون|سانس|مراقب/,
      hi: /आराम|साँस|ध्यान/, bn: /শিথিলতা|শ্বাস|ধ্যান/, fil: /pagpapahinga|paghinga|meditasyon/i,
    };
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup((await FeaturePage(props(locale, "mental-health"))) as ReactElement);
      const meta = await generateMetadata(props(locale, "mental-health"));
      expect([locale, RELAX[locale].test(html + String(meta.title) + String(meta.description))]).toEqual([locale, false]);
      expect(() => lookup(locale, "FeaturePages.mentalHealth.p3Title")).toThrow();
    }
    expect(await llms().text()).not.toMatch(/breathing|meditation/i);
  });

  it("are listed in the sitemap and llms.txt and not disallowed by robots", async () => {
    const xml = await (await staticSitemap()).text();
    for (const feature of FEATURE_PAGES) for (const locale of LOCALES) expect(xml).toContain(`<loc>${ORIGIN}/${locale}/features/${feature.slug}</loc>`);
    const body = await llms().text();
    for (const feature of FEATURE_PAGES) expect(body).toContain(`(/ar/features/${feature.slug})`);
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      const disallow = ([] as string[]).concat(rule.disallow ?? []);
      expect(disallow.some((d) => "/ar/features/pregnancy".startsWith(d))).toBe(false);
    }
  });

  it("get no noindex header from the proxy", async () => {
    const { isPublicIndexable } = await import("@/lib/seo/public-indexable");
    for (const locale of LOCALES) {
      for (const feature of FEATURE_PAGES) expect(isPublicIndexable(`/${locale}/features/${feature.slug}`)).toBe(true);
    }
  });
});

describe("AI nutrition plan parser (owner decision 2026-10-05)", () => {
  it("reads the days and meals, and is null when nothing can be shown", async () => {
    const { parseNutritionPlan } = await import("@/lib/nutrition/plan");
    expect(parseNutritionPlan({ id: "p1", created_at: "2026-10-14T00:00:00Z", days: [{ day: 2, meals: ["Eggs", { title: "Dinner", description: "Fish" }] }] }))
      .toEqual({ id: "p1", createdAt: "2026-10-14T00:00:00Z", days: [{ day: 2, meals: ["Eggs", "Dinner: Fish"] }] });
    expect(parseNutritionPlan({ id: "p1", days: [] })).toBeNull();
    expect(parseNutritionPlan(null)).toBeNull();
  });
});
