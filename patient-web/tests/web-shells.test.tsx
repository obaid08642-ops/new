import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShell, StickyFooter } from "@/components-next/ui-generated/shells";

/*
 * DEVICE_STANDARD §1, web: <AppShell> and <StickyFooter>. The rules the reviewer's
 * Playwright gate measures (no horizontal scroll, safe areas, 100dvh, RTL) start
 * here, in the one stylesheet every page shares.
 */

const web = (p: string) => resolve(process.cwd(), p);
const css = readFileSync(web("components-next/ui-generated/shells/shells.css"), "utf8");
const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = readFileSync(web("app/design-tokens/tokens.css"), "utf8");
/** The top-level rule whose selector is exactly `selector` (not a descendant rule that contains it). */
const rule = (selector: string) => {
  const start = body.indexOf(`\n${selector} {`);
  return start === -1 ? "" : body.slice(start, body.indexOf("}", start));
};

describe("web shells (DEVICE_STANDARD §1)", () => {
  it("uses 100dvh, never 100vh, and logical properties only", () => {
    expect(body).toContain("100dvh");
    expect(body).not.toMatch(/\b100vh\b/);
    expect(body).not.toMatch(/(^|[\s;{])(left|right|margin-left|margin-right|padding-left|padding-right)\s*:/m);
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("pads the bars and the CTA with the safe-area insets", () => {
    expect(rule(".nabd-shell__top")).toContain("env(safe-area-inset-top)");
    expect(rule(".nabd-shell__tabs")).toContain("env(safe-area-inset-bottom)");
    expect(rule(".nabd-shell__bottom")).toMatch(/position: sticky;[\s\S]*inset-block-end: 0/);
    expect(rule(".nabd-sticky-footer")).toMatch(/padding-block-end:\s*max\(var\(--nabd-space-sm\), env\(safe-area-inset-bottom\)\)/);
    expect(body).toMatch(/env\(safe-area-inset-left\), env\(safe-area-inset-right\)/);
  });

  it("switches layout at the tablet and laptop breakpoints from the tokens", () => {
    expect(tokens).toContain("--nabd-layout-breakpoints-tablet: 768px;");
    expect(tokens).toContain("--nabd-layout-breakpoints-laptop: 1024px;");
    expect(tokens).toContain("--nabd-layout-maxContent: 1200px;");
    expect(body).toContain("@media (min-width: 768px)");
    expect(body).toContain("@media (min-width: 1024px)");
    expect(rule(".nabd-shell__content")).toContain("max-inline-size: var(--nabd-layout-maxContent)");
  });

  it("references only tokens that exist", () => {
    const defined = new Set([...tokens.matchAll(/(--nabd-[A-Za-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const local = new Set([...body.matchAll(/(--nabd-shell-[a-z-]+)\s*:/g)].map((m) => m[1]));
    const used = [...new Set([...body.matchAll(/var\((--nabd-[A-Za-z0-9-]+)/g)].map((m) => m[1]))];
    const missing = used.filter((v) => !defined.has(v) && !local.has(v));
    expect(missing, `undefined: ${missing.join(", ")}`).toEqual([]);
  });

  it("renders the landmarks: banner, named navigation, main, and a named rail toggle", () => {
    const html = renderToStaticMarkup(
      <AppShell
        topBar={<span>top</span>}
        sideNav={<a href="/ar/orders"><span className="nabd-shell-label">طلباتي</span></a>}
        tabBar={<a href="/ar">الرئيسية</a>}
        sideNavLabel="التنقل الجانبي"
        tabBarLabel="التنقل الرئيسي"
        railToggleLabel="توسيع القائمة"
      >
        <p>content</p>
      </AppShell>,
    );
    expect(html).toContain('<header class="nabd-shell__top">');
    expect(html).toContain('aria-label="التنقل الجانبي"');
    expect(html).toContain('aria-label="التنقل الرئيسي"');
    expect(html).toMatch(/<main id="main" class="nabd-shell__main">/);
    expect(html).toContain('data-has-side="true"');
    expect(html).toContain('data-side-collapsed="true"');
    expect(html).toMatch(/<button type="button" class="nabd-shell__rail-toggle" aria-label="توسيع القائمة" aria-expanded="false"/);
  });

  it("puts the page CTA and the tab bar in one sticky bottom area, CTA first", () => {
    const html = renderToStaticMarkup(
      <AppShell topBar={<span>top</span>} tabBar={<a href="/ar">home</a>} footer={<StickyFooter><button>ادفع</button></StickyFooter>}>
        <p>c</p>
      </AppShell>,
    );
    const bottom = html.slice(html.indexOf('<div class="nabd-shell__bottom">'));
    expect(bottom.indexOf("nabd-sticky-footer")).toBeGreaterThan(-1);
    expect(bottom.indexOf("nabd-sticky-footer")).toBeLessThan(bottom.indexOf("nabd-shell__tabs"));
    expect(html).toContain('data-has-tabs="true"');
    // with the tab bar under it, the CTA does not add the bottom inset again
    expect(body).toMatch(/\.nabd-shell\[data-has-tabs="true"\] \.nabd-shell__bottom \.nabd-sticky-footer \{\s*padding-block-end: var\(--nabd-space-xs\);/);
  });

  it("without a side nav there is no rail and the tab bar stays", () => {
    const html = renderToStaticMarkup(<AppShell topBar={<span>top</span>} tabBar={<a href="/ar">home</a>}><p>c</p></AppShell>);
    expect(html).toContain('data-has-side="false"');
    expect(html).not.toContain("nabd-shell__rail-toggle");
    expect(html).toContain("nabd-shell__tabs");
  });

  it("StickyFooter is a named region only when given a label", () => {
    expect(renderToStaticMarkup(<StickyFooter label="إجراءات الدفع"><button>ادفع</button></StickyFooter>)).toContain('role="region" aria-label="إجراءات الدفع"');
    expect(renderToStaticMarkup(<StickyFooter><button>ادفع</button></StickyFooter>)).not.toContain("role=");
  });
});
