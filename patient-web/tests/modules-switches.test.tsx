import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/ar/loyalty/hub" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ModuleRouteGate, ModulesProvider } from "@/components-next/modules/modules-provider";
import { AiCard, AllServices, ServiceGrid } from "@/components-next/home/home-parts";
import { parseDisabled } from "@/lib/modules";
import { createTranslator } from "@/tests/helpers/intl";

const gate = (path: string, disabled: Parameters<typeof ModulesProvider>[0]["disabled"]) => {
  nav.path = path;
  return renderToStaticMarkup(
    <ModulesProvider disabled={disabled}>
      <ModuleRouteGate locale="ar" title="Unavailable title" body="Unavailable body" homeLabel="Home">
        <p>the page</p>
      </ModuleRouteGate>
    </ModulesProvider>,
  );
};

describe("ModuleRouteGate", () => {
  it("shows the unavailable state instead of a page of a switched-off module", () => {
    const html = gate("/ar/loyalty/hub", ["loyalty"]);
    expect(html).toContain("Unavailable title");
    expect(html).toContain("Unavailable body");
    expect(html).not.toContain("the page");
  });

  it("lets every other page through, and everything through when nothing is off", () => {
    expect(gate("/ar/c", ["loyalty"])).toContain("the page");
    expect(gate("/ar/loyalty/hub", [])).toContain("the page");
  });
});

describe("home entry points", () => {
  const t = createTranslator("en", "HomeWeb") as never;
  it("drops the tiles, the assistant card and the rows of a switched-off module", () => {
    const off = parseDisabled({ modules: { pharmacy: false, nursing: false, nutrition: false, ai: false, loyalty: false, articles: false } });
    const grid = renderToStaticMarkup(<ServiceGrid locale="en" t={t} disabled={off} />);
    expect(grid).not.toContain('href="/en/c"');
    expect(grid).not.toContain("/en/nursing/catalog");
    expect(grid).not.toContain("/en/nutrition");
    expect(grid).toContain("/en/consultations/doctors");
    expect(grid).toContain("/en/maternity");
    expect(renderToStaticMarkup(<AiCard locale="en" t={t} disabled={off} />)).toBe("");
    const rows = renderToStaticMarkup(<AllServices locale="en" t={t} labels={createTranslator("en", "Dashboard") as never} disabled={off} />);
    expect(rows).not.toContain("/en/loyalty");
    expect(rows).not.toContain("/en/articles");
    expect(rows).not.toContain("/en/medicines");
    expect(rows).toContain("/en/appointments");
  });

  it("draws everything when nothing is switched off", () => {
    const grid = renderToStaticMarkup(<ServiceGrid locale="en" t={t} />);
    expect(grid).toContain('href="/en/c"');
    expect(renderToStaticMarkup(<AiCard locale="en" t={t} />)).toContain("/en/ai");
  });
});
