import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("not-found"); }), redirect: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("./helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-shell": true }, children) }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: vi.fn(async () => "token") }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.api }));

import { OffersScreen } from "@/components-next/pharmacy-offers/offers-screen";

const ORDER = "6e317348-1c49-4828-ae70-f3a08f8d23c1";
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const answer = (order: Record<string, unknown>, offers: unknown[] = []) => state.api.mockImplementation(async (raw?: string) => { const path = String(raw ?? ""); return (
  path.endsWith("/offers") ? json(offers) : path === "/system-config/public" ? json({}) : json({ id: ORDER, ...order })); });

/** Decision 13 (issue 332): the offers page while the server widens its search, and once it ended with no pharmacy. TEST values. */
describe("offers waiting (decision 13)", () => {
  beforeEach(() => state.api.mockReset());

  it("a broadcasting order is still searching: the hero says the round and how far the search reached", async () => {
    answer({ status: "broadcasting", governed_state: "ORDER_BROADCASTING", search: { state: "expanding", round: 2, radius_km: 5, ends_at: "2026-10-15T10:00:00Z" } });
    const html = renderToStaticMarkup(await OffersScreen({ locale: "en", orderId: ORDER, variant: "broadcast" }));
    expect(html).toContain("Round 2: searching pharmacies within 5 km");
    expect(html).toContain("Nearby pharmacies are reviewing your request");
  });

  it("the search ended with no pharmacy: it says so and leads back to the pharmacy, never an endless wait", async () => {
    answer({ status: "manual_review", governed_state: "AUTO_CANCELLED", search: { state: "no_pharmacy_available" } });
    const html = renderToStaticMarkup(await OffersScreen({ locale: "en", orderId: ORDER, variant: "broadcast" }));
    expect(html).toContain("No pharmacy is available right now");
    expect(html).toContain('href="/en/pharmacy"');
    expect(html).not.toContain("Nearby pharmacies are reviewing your request");
  });
});
