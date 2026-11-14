import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ api: vi.fn(), service: vi.fn(), addresses: vi.fn(), access: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("not-found"); }), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr", locales: ["en"] }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.access }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.api }));
vi.mock("@/lib/api/home-care-services-server", () => ({ getPatientHomeCareService: state.service }));
vi.mock("@/lib/api/addresses-server", () => ({ getPatientAddresses: state.addresses }));

import NurseProfilePage from "./page";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const render = async (searchParams: Record<string, string> = {}, nurseId = "nurse-1") => renderToStaticMarkup((await NurseProfilePage({ params: Promise.resolve({ locale: "en", nurseId }), searchParams: Promise.resolve(searchParams) })) as never);

describe("the nurse profile page (parity with the app's nurse-profile)", () => {
  beforeEach(() => {
    state.access.mockReset().mockResolvedValue("tok");
    state.api.mockReset().mockImplementation(async (path: string) => (path.startsWith("/home-care/providers/") ? json({ id: "nurse-1", name_en: "Leila Nurse", facility_name: "Care Clinic", rating: 4.5, reviews_count: 12, years_experience: 6, degree: "BSN", price: 90, available_now: true }) : json({ has_policy: true, policy: { company_name: "Bupa", policy_number: "P-1" } })));
    state.service.mockReset().mockResolvedValue(json({ data: { id: "svc-1", name_en: "Wound care", price: 80, insurance_availability: true } }));
    state.addresses.mockReset().mockResolvedValue(json([{ id: "a-1", label: "Home", lat: 24.7, lng: 46.7 }]));
  });
  it("draws who the nurse is and the booking part with the amount on the button", async () => {
    const html = await render({ serviceId: "svc-1" });
    expect(state.api).toHaveBeenCalledWith(expect.stringContaining("/home-care/providers/nurse-1?serviceId=svc-1"), expect.anything(), "tok");
    expect(html).toContain("Leila Nurse");
    expect(html).toContain("Care Clinic");
    expect(html).toContain("BSN");
    expect(html).toContain("Available now");
    expect(html).toContain("Confirm booking");
    expect(html).toContain("90.00");
    expect(html).not.toContain("style=");
  });
  it("without a service it asks to choose one and draws no booking form", async () => {
    const html = await render();
    expect(html).toContain("Choose a service to book this nurse");
    expect(html).not.toContain("Confirm booking");
    expect(state.service).not.toHaveBeenCalled();
  });
  it("an unknown nurse is not found and an unreadable one is an error state", async () => {
    state.api.mockResolvedValue(json({}, 404));
    await expect(render({ serviceId: "svc-1" })).rejects.toThrow("not-found");
    state.api.mockResolvedValue(json({}, 503));
    expect(await render({ serviceId: "svc-1" })).toContain("Profile Currently Unavailable");
  });
  it("the insurance flow shows the policy on file", async () => {
    const html = await render({ serviceId: "svc-1", pay: "insurance" });
    expect(html).toContain("Bupa");
    expect(html).toContain("P-1");
  });
});
