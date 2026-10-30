import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SPECIALTY_ART, SPECIALTY_ART_BY_SLUG, SPECIALTY_ART_KEYS, SPECIALTY_ART_SLUGS, SPECIALTY_ART_TONE, filterSpecialties, isComingSoon, orderSpecialties, specialtyArtKey,
} from "@/components-next/ui-generated/icons/specialty-art";
import { SERVICE_TONES } from "@/components-next/ui-generated/icons/fill";
import { SPECIALTY_SLUGS } from "@/lib/specialties";
import { SpecialtyArt, SpecialtyGrid, SpecialtyRow, SpecialtyTile } from "@/components-next/consult/specialty-tiles";

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return { default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) };
});

const rows = [
  { slug: "dermatology", nameAr: "جلدية", nameEn: "Dermatology", count: 0 },
  { slug: "cardiology", nameAr: "قلب", nameEn: "Cardiology", count: 9 },
  { slug: "speech_therapy", nameAr: "تخاطب", nameEn: "Speech Therapy", count: 0 },
  { slug: "future_specialty", nameAr: "جديد", nameEn: "Future", count: 4 },
  { slug: "pediatrics", nameAr: "أطفال", nameEn: "Pediatrics", count: 14 },
  { slug: "family_medicine", nameAr: "طب الأسرة", nameEn: "Family Medicine", count: 2 },
  { slug: "ent", nameAr: "أنف", nameEn: "ENT", count: 9 },
];
const nameOf = (row: { nameEn?: string }) => row.nameEn ?? "";

describe("specialty registry", () => {
  it("covers exactly the backend slugs: an illustration or the explicit fallback, nothing else", () => {
    const backend = readFileSync(join(__dirname, "../../backend/src/common/enums.ts"), "utf8");
    const master = backend.slice(backend.indexOf("SPECIALTY_MASTER"), backend.indexOf("// Facility types"));
    const slugs = [...master.matchAll(/slug: '([a-z_]+)'/g)].map((m) => m[1]);
    expect([...SPECIALTY_ART_SLUGS].sort()).toEqual([...slugs].sort());
    expect([...SPECIALTY_SLUGS].sort()).toEqual([...slugs].sort());
    for (const slug of SPECIALTY_ART_SLUGS) {
      const choice = SPECIALTY_ART_BY_SLUG[slug];
      expect(choice === "fallback" || (SPECIALTY_ART_KEYS as readonly string[]).includes(choice), slug).toBe(true);
      // batch 2: every KNOWN slug now has its own picture; "fallback" is only the typed escape for a slug added later
      expect(choice, slug).not.toBe("fallback");
    }
  });

  it("the 18 batch-2 pictures are each used, distinct from each other, and drawn on the 64 grid with the five roles only", () => {
    const batch2 = (SPECIALTY_ART_KEYS as readonly string[]).slice(17, 35);
    expect(batch2).toHaveLength(18);
    const shapesOf = (k: string) => JSON.stringify(SPECIALTY_ART[k as keyof typeof SPECIALTY_ART]);
    expect(new Set(batch2.map(shapesOf)).size).toBe(18);
    for (const key of batch2) {
      expect(Object.values(SPECIALTY_ART_BY_SLUG), key).toContain(key);
      for (const shape of SPECIALTY_ART[key as keyof typeof SPECIALTY_ART]) {
        for (const role of [shape.fill, shape.stroke]) if (role) expect(["bg", "fg", "ink", "coral", "surface"]).toContain(role);
      }
    }
  });

  it("every art has shapes and a tone from the ten service tones; the first batch covers the most used specialties", () => {
    for (const key of SPECIALTY_ART_KEYS) {
      expect(SPECIALTY_ART[key].length, key).toBeGreaterThan(1);
      expect(SERVICE_TONES).toContain(SPECIALTY_ART_TONE[key]);
    }
    for (const slug of ["cardiology", "dermatology", "pediatrics", "gynecology", "orthopedics", "internal_medicine", "ent", "ophthalmology", "dentistry", "psychiatry", "urology", "neurology", "general_practice", "nutrition"]) {
      expect(specialtyArtKey(slug), slug).not.toBeNull();
    }
  });

  it("a specialty with no illustration (or an unknown slug) has no art key: the client draws its fill icon", () => {
    expect(specialtyArtKey("family_medicine")).toBe("family");
    expect(specialtyArtKey("future_specialty")).toBeNull();
    expect(specialtyArtKey(undefined)).toBeNull();
  });
});

describe("specialty tile rules", () => {
  it("orders with-doctors first by most doctors (ties keep the registry order), then the rest in the registry order", () => {
    const tiles = orderSpecialties(rows, nameOf);
    expect(tiles.map((t) => t.slug)).toEqual(["pediatrics", "cardiology", "ent", "future_specialty", "family_medicine", "dermatology", "speech_therapy"]);
    expect(tiles.map((t) => t.comingSoon)).toEqual([false, false, false, false, false, true, true]);
  });

  it("flags coming soon when there is no published doctor", () => {
    expect(isComingSoon({ count: 0 })).toBe(true);
    expect(isComingSoon({})).toBe(true);
    expect(isComingSoon({ count: 1 })).toBe(false);
  });

  it("searches the name in the page language, the Arabic and the English name", () => {
    const tiles = orderSpecialties(rows, (row) => (row.slug === "cardiology" ? "Heart doctors" : nameOf(row)));
    const names = Object.fromEntries(rows.map((r) => [r.slug, { nameAr: r.nameAr, nameEn: r.nameEn }]));
    expect(filterSpecialties(tiles, "heart", names).map((t) => t.slug)).toEqual(["cardiology"]);
    expect(filterSpecialties(tiles, "قلب", names).map((t) => t.slug)).toEqual(["cardiology"]);
    expect(filterSpecialties(tiles, "CARDIO", names).map((t) => t.slug)).toEqual(["cardiology"]);
    expect(filterSpecialties(tiles, "  ", names)).toHaveLength(tiles.length);
    expect(filterSpecialties(tiles, "zzz", names)).toHaveLength(0);
  });
});

describe("specialty tiles", () => {
  it("draws roles as classes (no colour value, no style attribute) and is decorative", () => {
    const html = renderToStaticMarkup(<SpecialtyArt art="cardiology" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/style=|#[0-9a-fA-F]{3,8}\b|rgb\(/);
  });

  it("the row has All first, the ordered specialties, and All specialties last; the name is the label; coming soon is muted and marked", () => {
    const tiles = orderSpecialties(rows, nameOf);
    const html = renderToStaticMarkup(
      <SpecialtyRow label="Specialty" allLabel="All" allHref="/en/consultations/doctors" allSelected={false} moreLabel="All specialties" moreHref="/en/consultations/specialties" comingSoonLabel="Coming soon" selectedSlug="cardiology" tiles={tiles} hrefOf={(slug) => `/en/consultations/doctors?specialty=${slug}`} />,
    );
    const labels = [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]).filter((l) => l !== "Specialty");
    expect(labels).toEqual(["All", "Pediatrics", "Cardiology", "ENT", "Future", "Family Medicine", "Dermatology, Coming soon", "Speech Therapy, Coming soon", "All specialties"]);
    expect(html).toContain('href="/en/consultations/doctors?specialty=cardiology"');
    expect(html).toMatch(/aria-current="true"[^>]*data-selected="true"/);
    expect(html).toContain('data-soon="true"');
    // a slug with no illustration (a new backend slug): the fill icon, never a blank tile
    expect(html).toMatch(/data-art="fallback"[^]*?<svg/);
    expect(html).not.toMatch(/style=/);
  });

  it("the grid lists every tile with its link", () => {
    const html = renderToStaticMarkup(<SpecialtyGrid label="Specialties" comingSoonLabel="Coming soon" tiles={orderSpecialties(rows, nameOf)} hrefOf={(slug) => `/en/consultations/doctors?specialty=${slug}`} />);
    expect((html.match(/<li>/g) ?? []).length).toBe(rows.length);
    expect(renderToStaticMarkup(<SpecialtyTile href="/x" label="Heart" art="cardiology" />)).toContain("nabd-tone--coral");
  });

  it("the row css scrolls sideways with snap and logical properties", () => {
    const css = readFileSync(join(__dirname, "../components-next/consult/specialty-tiles.module.css"), "utf8");
    expect(css).toMatch(/\.row\s*\{[^}]*overflow-x: auto[^}]*scroll-snap-type: x proximity/);
    expect(css).not.toMatch(/margin-left|margin-right|padding-left|padding-right|text-align: (left|right)/);
  });
});
