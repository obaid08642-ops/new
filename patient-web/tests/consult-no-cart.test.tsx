import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

let path = "/en";
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ itemCount: 4 }) }));
vi.mock("next/navigation", () => ({ usePathname: () => path, useRouter: () => ({ push: () => undefined, prefetch: () => undefined }) }));
vi.mock("@/components-next/ordering/use-basket", () => ({ useBasket: () => ({ basket: { lab: [{}], radiology: [], nursing: [{}] } }) }));
vi.mock("@/components-next/nav/use-route-prefetch", () => ({ useRoutePrefetch: () => undefined }));
vi.mock("@/components-next/modules/modules-provider", () => ({ useDisabledModules: () => new Set<string>() }));
vi.mock("next/link", () => ({ default: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as never}</a> }));

import { CoreShell } from "@/components-next/core/core-shell";
import { ConsultPage } from "@/components-next/consult/consult-page";

const wrap = (node: React.ReactNode) => renderToStaticMarkup(<NextIntlClientProvider locale="en" timeZone="UTC" messages={en}>{node}</NextIntlClientProvider>);
// CartLink draws a button labelled "Cart (n)" (cart-badge testid); the carts chooser is the same button
const hasCart = (html: string) => html.includes("cart-badge") || /aria-label="Cart/.test(html);

describe("no cart button in consultations (owner, 2026-10-30)", () => {
  const consultPaths = [
    "/en/consultations", "/en/consultations/doctors", "/en/consultations/specialties", "/en/consultations/doctors/d1",
    "/en/consultations/book/d1", "/en/consultations/video-call", "/en/consultations/instant", "/en/doctor/dr-test",
    "/en/appointments", "/en/appointments/a1", "/en/room/r1",
  ];
  it("ConsultPage draws no cart on any consultation route, even with items in other carts", () => {
    for (const p of consultPaths) {
      path = p;
      const html = wrap(<ConsultPage locale="en" title="T" backHref="/en"><p>x</p></ConsultPage>);
      expect(hasCart(html), p).toBe(false);
    }
  });
  it("with an appointments href the My appointments link renders and still no cart", () => {
    path = "/en/consultations/doctors";
    const html = wrap(<ConsultPage locale="en" title="T" appointmentsHref="/en/appointments"><p>x</p></ConsultPage>);
    expect(html).toContain('href="/en/appointments"');
    expect(hasCart(html)).toBe(false);
  });
  it("the Home, Pharmacy, Labs and Nursing shells still render the cart", () => {
    for (const p of ["/en", "/en/c/vitamins", "/en/diagnostics", "/en/nursing/catalog"]) {
      path = p;
      expect(hasCart(wrap(<CoreShell locale="en" title="T"><p>x</p></CoreShell>)), p).toBe(true);
    }
  });
  it("source guard: no consultation file imports CartLink", () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
      const f = join(dir, n);
      return statSync(f).isDirectory() ? walk(f) : /\.(tsx?|jsx?)$/.test(n) && !/\.test\./.test(n) ? [f] : [];
    });
    const files = [...walk(resolve(process.cwd(), "app/[locale]/consultations")), ...walk(resolve(process.cwd(), "components-next/consult"))];
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/\bCartLink\b/);
    expect(readFileSync(resolve(process.cwd(), "components-next/consult/consult-page.tsx"), "utf8")).toContain("hideCart");
  });
});
