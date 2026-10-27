// Owner layout decisions 1 and 2: favourites icon next to the cart, and the menu is the last header item.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

vi.mock("next/navigation", () => ({ usePathname: () => "/en" }));
vi.mock("next/link", () => ({ default: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as never}</a> }));

import { WishlistLink } from "@/components-next/core/wishlist-link";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("the header favourites button", () => {
  it("links to the existing wishlist page with an accessible label and no badge before the count is known", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ CoreShell: en.CoreShell }}><WishlistLink locale="en" /></NextIntlClientProvider>,
    );
    expect(html).toContain('href="/en/wishlist"');
    expect(html).toContain('aria-label="Favourites"');
    expect(html).not.toContain("wishlist-badge");
  });

  it("reads the saved count only for a signed-in patient: a visitor or a guest account never calls /wishlist (it answers 401)", () => {
    const source = read("components-next/core/wishlist-link.tsx");
    expect(source).toContain("useSessionIdentity()");
    expect(source).toContain('identity.status === "user" && !identity.isGuest');
    expect(source.indexOf("if (!canRead)")).toBeGreaterThan(-1);
    expect(source.indexOf("if (!canRead)")).toBeLessThan(source.indexOf('fetch("/api/patient/users/me/wishlist"'));
  });

  it("sits before the cart and the menu is the last item in the phone header of the core and home shells", () => {
    const core = read("components-next/core/core-shell.tsx");
    const phone = core.slice(core.indexOf("every page carries favourites"));
    expect(phone.indexOf("<WishlistLink")).toBeLessThan(phone.indexOf("cartLink(styles.phoneOnly)"));
    expect(phone.indexOf("cartLink(styles.phoneOnly)")).toBeLessThan(phone.indexOf("<PhoneMenu"));
    expect(phone.indexOf("<PhoneMenu")).toBeLessThan(phone.indexOf("styles.tools"));
    const home = read("components-next/home/home-shell.tsx");
    expect(home).not.toContain("<CartLink");
    expect(home).not.toContain("<SignOutButton");
  });
});
