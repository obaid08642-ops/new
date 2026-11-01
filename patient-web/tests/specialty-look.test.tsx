import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SPECIALTY_ALL_LOOK, SPECIALTY_LOOK, SPECIALTY_SLUGS as LOOK_SLUGS, filterSpecialties, orderSpecialties, specialtyLook } from "@/components-next/ui-generated/icons/specialty-look";
import { FILL_ICON_PATHS, SERVICE_TONES } from "@/components-next/ui-generated/icons/fill";
import { SPECIALTY_SLUGS } from "@/lib/specialties";
import { SpecialtyGrid, SpecialtyRow, SpecialtyTile } from "@/components-next/consult/specialty-tiles";

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

describe("specialty look", () => {
  it("covers exactly the backend slugs, each with an icon of the board's set and a service tone", () => {
    const backend = readFileSync(join(__dirname, "../../backend/src/common/enums.ts"), "utf8");
    const master = backend.slice(backend.indexOf("SPECIALTY_MASTER"), backend.indexOf("// Facility types"));
    const slugs = [...master.matchAll(/slug: '([a-z_]+)'/g)].map((m) => m[1]);
    expect([...LOOK_SLUGS].sort()).toEqual([...slugs].sort());
    expect([...SPECIALTY_SLUGS].sort()).toEqual([...slugs].sort());
    for (const slug of LOOK_SLUGS) {
      expect(Object.keys(FILL_ICON_PATHS), slug).toContain(SPECIALTY_LOOK[slug].icon);
      expect(SERVICE_TONES, slug).toContain(SPECIALTY_LOOK[slug].tone);
    }
  });

  it("the seven specialties of the board keep the icon and tone it draws", () => {
    expect(specialtyLook("internal_medicine")).toEqual({ icon: "stethoscope", tone: "blue" });
    expect(specialtyLook("dentistry")).toEqual({ icon: "tooth", tone: "mint" });
    expect(specialtyLook("dermatology")).toEqual({ icon: "hand-heart", tone: "pink" });
    expect(specialtyLook("ophthalmology")).toEqual({ icon: "eye", tone: "teal" });
    expect(specialtyLook("cardiology")).toEqual({ icon: "heart", tone: "coral" });
    expect(specialtyLook("pediatrics")).toEqual({ icon: "baby", tone: "amber" });
    expect(specialtyLook("orthopedics")).toEqual({ icon: "bone", tone: "violet" });
  });

  it("a slug this build does not list draws the board's stethoscope, never a blank tile", () => {
    expect(specialtyLook("future_specialty")).toEqual({ icon: "stethoscope", tone: "blue" });
    expect(specialtyLook(undefined)).toEqual({ icon: "stethoscope", tone: "blue" });
  });
});

describe("specialty tile rules", () => {
  it("orders with-doctors first by most doctors (ties keep the registry order), then the rest in the registry order; no tile is marked", () => {
    const tiles = orderSpecialties(rows, nameOf);
    expect(tiles.map((t) => t.slug)).toEqual(["pediatrics", "cardiology", "ent", "future_specialty", "family_medicine", "dermatology", "speech_therapy"]);
    expect(JSON.stringify(tiles)).not.toMatch(/soon/i);
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
  it("the row has All first, the ordered specialties, and All specialties last; every tile is a normal link named by its label", () => {
    const tiles = orderSpecialties(rows, nameOf);
    const html = renderToStaticMarkup(
      <SpecialtyRow label="Specialty" allLabel="All" allHref="/en/consultations/doctors" allSelected={false} moreLabel="All specialties" moreHref="/en/consultations/specialties" selectedSlug="cardiology" tiles={tiles} hrefOf={(slug) => `/en/consultations/doctors?specialty=${slug}`} />,
    );
    const labels = [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]).filter((l) => l !== "Specialty");
    expect(labels).toEqual(["All", "Pediatrics", "Cardiology", "ENT", "Future", "Family Medicine", "Dermatology", "Speech Therapy", "All specialties"]);
    expect(html).toContain('href="/en/consultations/doctors?specialty=cardiology"');
    expect(html).toMatch(/aria-current="true"[^>]*data-selected="true"/);
    expect(html).not.toMatch(/soon|data-soon|style=/i);
  });

  it("the grid lists every tile with its link, in the tile's tone", () => {
    const html = renderToStaticMarkup(<SpecialtyGrid label="Specialties" tiles={orderSpecialties(rows, nameOf)} hrefOf={(slug) => `/en/consultations/doctors?specialty=${slug}`} />);
    expect((html.match(/<li>/g) ?? []).length).toBe(rows.length);
    expect(renderToStaticMarkup(<SpecialtyTile href="/x" label="Heart" look={specialtyLook("cardiology")} />)).toContain("nabd-tone--coral");
    expect(renderToStaticMarkup(<SpecialtyTile href="/x" label="All" look={SPECIALTY_ALL_LOOK} />)).toContain("nabd-tone--ink");
  });

  it("the row css scrolls sideways with snap, uses logical properties and no colour value, and the tile is the board's 64", () => {
    const css = readFileSync(join(__dirname, "../components-next/consult/specialty-tiles.module.css"), "utf8");
    expect(css).toMatch(/\.row\s*\{[^}]*overflow-x: auto[^}]*scroll-snap-type: x proximity/);
    expect(css).toMatch(/\.tile\s*\{[^}]*inline-size: 64px/);
    // the row is one line of names (the board's): no tile is stretched by a long name, so no empty band is left under the others
    expect(css).toMatch(/\.row \.label\s*\{[^}]*white-space: nowrap[^}]*text-overflow: ellipsis/);
    expect(css).toMatch(/\.row\s*\{[^}]*padding: 3px 3px 0/);
    expect(css).not.toMatch(/margin-left|margin-right|padding-left|padding-right|text-align: (left|right)|#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
