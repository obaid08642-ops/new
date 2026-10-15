import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ catalog: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("./helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-shell": true }, children),
}));
vi.mock("@/components-next/nav/stale-while-revalidate", () => ({ StaleWhileRevalidate: () => null }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr", locales: ["en"] }));
vi.mock("@/lib/seo", () => ({ localizedUrl: () => "https://example.test/" }));
vi.mock("@/lib/api/nursing-catalog-server", () => ({ getPublicNursingCatalog: state.catalog }));

import NursingCatalogPage from "@/app/[locale]/nursing/catalog/page";
import { nursingStatus, serviceIcon } from "@/components-next/nursing/nursing-parts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/ /g, " ");

/**
 * Batch 4, slice 4-web: the nursing parts and the two screens that changed meaning. Every value is a TEST value. What is
 * proved: states are phrases (the raw code is never drawn); the catalogue offers no booking window and invents no price
 * (it used to confirm a made-up reference after a timer); the booking form draws labelled controls with no inline style
 * and its call is the one it always made, answering a booking only when the server did.
 */
describe("nursingStatus", () => {
  it("groups the booking, visit and insurance states into phrases with a tone", () => {
    expect(nursingStatus("COMPLETED").key).toBe("completed");
    expect(nursingStatus("nurse_en_route").key).toBe("enRoute");
    expect(nursingStatus("PENDING_INSURANCE").key).toBe("insuranceReview");
    expect(nursingStatus("WAITING_COPAY").key).toBe("waitingCopay");
    expect(nursingStatus("REJECTED").key).toBe("rejected");
  });
  it("shows an unknown or missing state as unavailable", () => {
    expect(nursingStatus("SOMETHING_NEW").key).toBe("unknown");
    expect(nursingStatus(undefined).key).toBe("unknown");
  });
  it("finds a glyph from the service's words and falls back to the nursing icon", () => {
    expect(serviceIcon("blood test")).toBe("test-tube");
    expect(serviceIcon("something else")).toBe("first-aid-kit");
  });
});

describe("the nursing catalogue", () => {
  beforeEach(() => state.catalog.mockReset());

  it("is a list of links to the service page, with no booking window and no price the server did not send", async () => {
    state.catalog.mockResolvedValue(json([{ id: "svc-1", name_en: "Wound care", description_en: "A dressing change" }, { id: "svc-2", name_en: "IV drip", price: 150 }]));
    const out = html(await NursingCatalogPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(out).toContain('href="/en/home-care/services/svc-1"');
    expect(out).toContain("Wound care");
    expect(out).toContain("A dressing change");
    expect(out).toContain("SAR");
    expect(out).not.toContain("180");
    expect(out).not.toContain("Book Now");
    expect(out).not.toContain("Confirm");
    expect(out).not.toContain("style=");
  });

  it("shows the empty state when the catalogue could not be read", async () => {
    state.catalog.mockResolvedValue(json({}, 500));
    const out = html(await NursingCatalogPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(out).toContain("No nursing services are currently available.");
  });
});

