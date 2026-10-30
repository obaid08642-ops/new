import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/en" }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", async () => {
  const helpers = await import("./helpers/intl");
  return { getTranslations: async (options: { locale?: string; namespace?: string } | string) => helpers.createTranslator("en", typeof options === "string" ? options : options.namespace) };
});

import { HomeShell } from "../components-next/home/home-shell";

/** The Home top bar tools: a fixed order (language, theme, notifications, favourites, cart, account / sign-in, menu), one size, one gap, logical CSS. */

const css = readFileSync(new URL("../components-next/home/home.module.css", import.meta.url), "utf8");
const localeCss = readFileSync(new URL("../components-next/locale-selector.module.css", import.meta.url), "utf8");
const shellSrc = readFileSync(new URL("../components-next/home/home-shell.tsx", import.meta.url), "utf8");

async function tools(signedIn: boolean, locale: "en" | "ar" = "en") {
  const html = renderToStaticMarkup(await HomeShell({ locale, signedIn, name: "Test", surface: "home", children: <p>x</p> }));
  const start = html.indexOf('class="tools');
  return html.slice(start >= 0 ? start : html.indexOf("tools"));
}
const at = (html: string, needle: RegExp) => html.search(needle);

describe("Home top bar (web)", () => {
  it.each([[true, "en"], [false, "en"], [true, "ar"]] as const)("signedIn=%s %s: the buttons follow the fixed order and the cart keeps a slot", async (signedIn, locale) => {
    const html = await tools(signedIn, locale);
    const slots = {
      language: at(html, /aria-haspopup="true"/),
      theme: at(html, /aria-pressed=/),
      wishlist: at(html, /href="[^"]*wishlist/),
      cart: at(html, /data-testid="home-cart-slot"/),
    } as const;
    for (const [name, index] of Object.entries(slots)) expect(index, name).toBeGreaterThanOrEqual(0);
    expect(slots.language).toBeLessThan(slots.theme);
    expect(slots.theme).toBeLessThan(slots.wishlist);
    expect(slots.wishlist).toBeLessThan(slots.cart);
    if (signedIn) {
      const bell = at(html, /href="[^"]*\/notifications"/);
      // the bell sits between the theme button and the favourites, as in the app
      expect(bell).toBeGreaterThan(slots.theme);
      expect(bell).toBeLessThan(slots.wishlist);
      const menu = html.lastIndexOf("aria-expanded=");
      expect(menu).toBeGreaterThan(slots.cart);
    }
  });

  it("source order is the fixed order", () => {
    const order = ["<LocaleSelector", "<ThemeButton", "NotificationBellLink", "<WishlistLink", "<CartLink", "<PhoneMenu"].map((t) => shellSrc.indexOf(t, shellSrc.indexOf("styles.tools")));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("every button is the same 44 / 24 size with one gap and logical CSS only", () => {
    expect(css).toContain("--top-hit: var(--nabd-a11y-minTouchTarget)");
    expect(css).toContain("--top-icon: 24px");
    expect(css).toContain(".tools { margin-inline-start: auto; display: flex; align-items: center; gap: var(--top-gap); }");
    // no 40px override of the buttons any more
    expect(css).not.toMatch(/\.iconBtn[^{]*\{[^}]*(inline|block)-size: 40px/);
    expect(localeCss).not.toMatch(/compactOnPhone \.trigger \{[^}]*40px/);
    // every badge sits on the inline-end block-start corner
    expect(css).toMatch(/\.bellDot \{[^}]*inset-block-start: -2px; inset-inline-end: -2px/);
    expect(css).toMatch(/\.cartBadge \{[^}]*inset-block-start: -2px; inset-inline-end: -2px/);
    // mirrored by the layout direction: no left / right in the home top bar rules
    expect(css.slice(css.indexOf(".tools {"), css.indexOf(".signIn {"))).not.toMatch(/\b(left|right)\b/);
    expect(shellSrc).not.toMatch(/style=\{/);
  });
});
