import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "./helpers/intl";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/en/search" }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", async () => {
  const helpers = await import("./helpers/intl");
  return { getTranslations: async (options: { locale?: string; namespace?: string } | string) => helpers.createTranslator("en", typeof options === "string" ? options : options.namespace) };
});

import { HomeShell } from "../components-next/home/home-shell";
import { CoreShell } from "../components-next/core/core-shell";
import { shellSectionHrefs } from "../components-next/shell-links";
import { SignOutButton } from "../components-next/sign-out-button";

async function home(signedIn: boolean) {
  return renderToStaticMarkup(await HomeShell({ locale: "en", signedIn, surface: "home", children: <p>x</p> }));
}
const core = () => renderToStaticMarkup(<CoreShell locale="en">x</CoreShell>);
const hrefsIn = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("the section links come from one source", () => {
  it("opens the same pages and names them the same from HomeShell and CoreShell", () => {
    const wanted = Object.values(shellSectionHrefs("en"));
    return home(true).then((homeHtml) => {
      for (const html of [homeHtml, core()]) {
        const links = hrefsIn(html);
        for (const href of wanted) expect(links, href).toContain(href);
      }
      // none of the old, different targets of the core shell remain
      const coreLinks = hrefsIn(core());
      for (const stale of ["/en/pharmacy", "/en/diagnostics/labs", "/en/home-care"]) expect(coreLinks).not.toContain(stale);
      const nav = createTranslator("en", "HomeWeb");
      for (const label of [nav("navPharmacy"), nav("navConsult"), nav("navLabs"), nav("navNursing")]) {
        const escaped = label.replace(/&/g, "&amp;");
        expect(homeHtml).toContain(escaped);
        expect(core()).toContain(escaped);
      }
    });
  });

  it("keeps the pages the Home board's tiles open", () => {
    expect(shellSectionHrefs("ur")).toEqual({
      pharmacy: "/ur/c",
      consult: "/ur/consultations/doctors",
      labs: "/ur/diagnostics",
      nursing: "/ur/nursing/catalog",
    });
  });
});

describe("sign-out is reachable from the shells", () => {
  const label = createTranslator("en", "Shared")("signOut");
  it("is in the signed-in Home bar and not in the signed-out one", async () => {
    expect(await home(true)).toContain(`aria-label="${label}"`);
    expect(await home(false)).not.toContain(`aria-label="${label}"`);
  });

  it("is in the core shell's bar", () => {
    expect(core()).toContain(`aria-label="${label}"`);
  });

  it("names itself in the page language and mirrors its arrow in right-to-left through a class (no inline style)", () => {
    const html = renderToStaticMarkup(<SignOutButton locale="en" className="x" />);
    expect(html).toContain("<button");
    expect(html).not.toContain("style=");
  });
});
