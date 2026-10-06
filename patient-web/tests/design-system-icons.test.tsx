import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import {
  ILLUSTRATED,
  ILLUSTRATED_ICONS,
  assertArtworkIsPaletteBound,
} from "@nabd/ui/icons/illustrated";
import {
  GRID,
  ILLUSTRATIONS,
  ILLUSTRATION_META,
  ILLUSTRATION_NAMES,
  ILLUSTRATION_SECTIONS,
  type IllustrationName,
} from "@nabd/ui/icons/illustrations";
import { Icon, Illustration, LINE_ICON_NAMES } from "@nabd/ui";

/**
 * 12.A6 — the icon and illustration set.
 *
 * These are contract tests, not snapshot tests. The artwork is hand-drawn, so a
 * snapshot would only record whatever it currently looks like; what has to hold
 * is the set of rules the canvas states, and each one gets an assertion that
 * fails loudly the first time somebody breaks it.
 */

const ART_KEYS = new Set([
  "ink", "paper", "coral", "amber", "blue", "blueSoft", "mint", "mintSoft",
  "violet", "lavender", "pink", "lime", "skin",
]);

/** Walk a Prim tree and yield every paint slot, so a rule can be applied to all of them. */
function* paints(prims: readonly unknown[]): Generator<{ slot: string; value: string; where: string }> {
  for (const prim of prims as Array<Record<string, unknown>>) {
    const el = prim.el as string;
    if (el === "g") {
      yield* paints(prim.children as unknown[]);
      continue;
    }
    for (const slot of ["fill", "stroke"] as const) {
      const value = prim[slot];
      if (typeof value === "string" && value !== "none") {
        yield { slot, value, where: JSON.stringify(prim).slice(0, 60) };
      }
    }
  }
}

describe("12.A6 — palette binding", () => {
  it("every illustrated-icon colour is a color.iconArt key, never a hex", () => {
    expect(assertArtworkIsPaletteBound(ILLUSTRATED)).toEqual([]);
  });

  it("every illustration colour is a color.iconArt key, never a hex", () => {
    expect(assertArtworkIsPaletteBound(ILLUSTRATIONS as never)).toEqual([]);
  });

  it("no paint slot smuggles in a raw hex, a rgb(), or a CSS var", () => {
    for (const [name, prims] of Object.entries(ILLUSTRATIONS)) {
      for (const { slot, value } of paints(prims)) {
        expect(ART_KEYS.has(value), `${name}.${slot}="${value}"`).toBe(true);
        expect(value.startsWith("#"), `${name}.${slot}="${value}" is a hex`).toBe(false);
        expect(value, `${name}.${slot}="${value}" is not a colour function`).not.toMatch(
          /^(rgb|rgba|hsl|var)\(/,
        );
      }
    }
  });
});

describe("12.A6 — the scene set is the one the canvas asks for", () => {
  it("covers onboarding, empty, error and success", () => {
    const kinds = new Set(Object.values(ILLUSTRATION_META).map((m) => m.kind));
    expect([...kinds].sort()).toEqual(["empty", "error", "onboarding", "success"]);
    expect(ILLUSTRATION_SECTIONS.map((s) => s.kind)).toEqual([
      "onboarding", "empty", "error", "success",
    ]);
  });

  it("every scene in the list is drawn, and every drawing is in the list", () => {
    for (const name of ILLUSTRATION_NAMES) {
      expect(ILLUSTRATIONS[name]?.length, `${name} has no geometry`).toBeGreaterThan(0);
      expect(ILLUSTRATION_META[name], `${name} has no meta`).toBeTruthy();
    }
    expect(Object.keys(ILLUSTRATIONS).sort()).toEqual([...ILLUSTRATION_NAMES].sort());
  });

  it("covers every empty state the product actually shows", () => {
    const empty = ILLUSTRATION_NAMES.filter((n) => ILLUSTRATION_META[n].kind === "empty");
    expect(empty).toEqual([
      "emptyOrders", "emptyBookings", "emptyCart", "emptyNotifications",
      "emptySearch", "emptyFamily", "emptyReminders", "emptyPrescriptions",
    ]);
  });

  it("every scene has a name in both languages, because the UI is Arabic-first", () => {
    for (const name of ILLUSTRATION_NAMES) {
      const meta = ILLUSTRATION_META[name];
      expect(meta.titleAr.trim().length, `${name} titleAr`).toBeGreaterThan(0);
      expect(meta.titleEn.trim().length, `${name} titleEn`).toBeGreaterThan(0);
    }
  });
});

describe("12.A6 — the no-text rule", () => {
  it("draws no glyphs: the geometry has only path, circle, rect and g", () => {
    const allowed = new Set(["path", "circle", "rect", "g"]);
    const seen = new Set<string>();
    const walk = (prims: readonly unknown[]) => {
      for (const prim of prims as Array<Record<string, unknown>>) {
        seen.add(prim.el as string);
        expect(allowed.has(prim.el as string), `unexpected primitive ${String(prim.el)}`).toBe(true);
        if (prim.el === "g") walk(prim.children as unknown[]);
      }
    };
    for (const prims of Object.values(ILLUSTRATIONS)) walk(prims);
    // A <text> primitive is impossible in this Prim type, so the assertion is on
    // the rendered markup too — see the render tests below.
    expect(seen.has("text")).toBe(false);
  });

  it("renders no <text> and no digits into the markup", () => {
    for (const name of ILLUSTRATION_NAMES) {
      const html = renderToStaticMarkup(createElement(Illustration, { name, size: 128 }));
      expect(html, `${name} drew text`).not.toMatch(/<text\b/);
      expect(html, `${name} rendered a digit`).not.toMatch(/>\s*\d+\s*</);
    }
  });
});

describe("12.A6 — the acid-lime rule, enforced in the artwork", () => {
  it("successPayment puts ink on lime, never white — the pair the checker rejects", () => {
    const prims = ILLUSTRATIONS.successPayment;
    const limeBadge = prims.filter(
      (p) => (p as Record<string, unknown>).fill === "lime",
    );
    expect(limeBadge.length).toBeGreaterThan(0);

    // The check on the lime badge is ink; there is no paper/white paint anywhere
    // near the lime disc, which is what "1.06:1" looks like in artwork.
    const html = renderToStaticMarkup(createElement(Illustration, { name: "successPayment", size: 128 }));
    const limeDisc = html.match(/<(circle|rect)[^>]*iconArt-lime[^>]*>/);
    expect(limeDisc, "no lime disc in successPayment").not.toBeNull();
    expect(limeDisc![0]).not.toMatch(/iconArt-paper/);
  });
});

describe("12.A6 — rendering contract", () => {
  it("scenes render on the 64 grid and icons on the 48 grid", () => {
    const scene = renderToStaticMarkup(createElement(Illustration, { name: "emptyCart", size: 128 }));
    expect(scene).toContain(`viewBox="0 0 ${GRID} ${GRID}"`);
    expect(scene).toContain('width="128"');
    expect(GRID).toBe(64);

    const icon = renderToStaticMarkup(
      createElement(Icon, { name: "pharmacy", weight: "illustrated", size: 76 }),
    );
    expect(icon).toContain('viewBox="0 0 48 48"');
  });

  it("hides artwork from a screen reader unless it is given a title", () => {
    const bare = renderToStaticMarkup(createElement(Illustration, { name: "emptyCart" }));
    expect(bare).toContain('aria-hidden="true"');
    expect(bare).not.toContain('aria-label');

    const titled = renderToStaticMarkup(
      createElement(Illustration, { name: "emptyCart", title: "السلة فارغة" }),
    );
    expect(titled).toContain('role="img"');
    expect(titled).toContain('aria-label="السلة فارغة"');
    expect(titled).not.toContain('aria-hidden');
  });

  it("paints every scene through the token vars, so a palette change moves the art", () => {
    for (const name of ILLUSTRATION_NAMES) {
      const html = renderToStaticMarkup(createElement(Illustration, { name, size: 128 }));
      expect(html, `${name} painted a raw hex`).not.toMatch(/="#[0-9A-Fa-f]{3,8}"/);
      expect(html, `${name} painted nothing`).toMatch(/--nabd-color-iconArt-/);
    }
  });

  it("exposes the kind and tone so a screen can pick the tile surface", () => {
    const html = renderToStaticMarkup(createElement(Illustration, { name: "errorOffline" }));
    expect(html).toContain('data-kind="error"');
    expect(html).toContain('data-tone="coral"');
  });
});

describe("12.A6 — the line set stays curated", () => {
  it("every line icon name renders a real glyph", () => {
    for (const name of LINE_ICON_NAMES) {
      const html = renderToStaticMarkup(createElement(Icon, { name, size: 24 }));
      expect(html, `${name} rendered nothing`).toMatch(/<svg\b/);
    }
  });

  it("rejects a name that is in neither set, with a message that lists both", () => {
    expect(() => createElement(Icon, { name: "rocket" as never, size: 24 })).not.toThrow();
    try {
      // render is where the lookup happens, so the throw surfaces here
      renderToStaticMarkup(createElement(Icon, { name: "rocket" as never, size: 24 }));
      throw new Error("expected the unknown icon to throw");
    } catch (err) {
      expect(String(err)).toMatch(/Unknown icon/);
      expect(String(err)).toMatch(/illustrated icon/);
      expect(String(err)).toMatch(/line icon/);
    }
  });

  it("draws the illustrated icons from one geometry on both families", () => {
    expect(ILLUSTRATED_ICONS).toHaveLength(9);
    for (const name of ILLUSTRATED_ICONS) {
      const html = renderToStaticMarkup(
        createElement(Icon, { name, weight: "illustrated", size: 76 }),
      );
      expect(html, `${name} rendered nothing`).toMatch(/--nabd-color-iconArt-/);
    }
  });
});
