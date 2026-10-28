import type { ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Issue 1550: the service landing pages render their public part for a guest and read nothing personal without a session.
const state = vi.hoisted(() => ({ token: undefined as string | undefined, calls: [] as Array<{ url: string; auth: string | null }>, routes: {} as Record<string, { status: number; body: unknown }> }));

// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not_found"); },
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth/session", () => ({ getOptionalPatientAccessToken: async () => state.token }));
vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children }: { children: unknown }) => createElement("div", { "data-shell": true }, children as never) };
});

import OffersPage from "@/app/[locale]/offers/page";
import InsurancePage from "@/app/[locale]/insurance/page";
import HomeCarePage from "@/app/[locale]/home-care/page";
import MaternityPage from "@/app/[locale]/maternity/page";
import MentalHealthPage from "@/app/[locale]/mental-health/page";
import NutritionPage from "@/app/[locale]/nutrition/page";
import { GET as mapProviders } from "@/app/api/map/providers/route";
import { parsePublicInsurers, parsePublicProviders, signInHref } from "@/lib/services/guest";

async function html(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

const params = Promise.resolve({ locale: "en" });
const searchParams = Promise.resolve({});
const DOCTOR = { id: "doc-psy-1", name_en: "Dr Calm", price: 250, consultation_modes: ["clinic"] };

beforeEach(() => {
  state.token = undefined;
  state.calls = [];
  state.routes = {
    "/home/offers": { status: 200, body: [{ id: "of-1", t: "عرض", t_en: "Spring checkup", price: 99, old: 150, disc: "34%", prov: "Clinic One" }] },
    "/insurance/companies": { status: 200, body: [{ id: "co-1", code: "ins1", name_ar: "تأمين", name_en: "Insure One", email: "private@x.y", plans: [{ id: "pl-1", name_en: "Gold", name_ar: "ذهبي", tier_level: 1 }] }] },
    "/home-care/services": { status: 200, body: [{ id: "svc-1", name_en: "Wound care", name_ar: "العناية بالجروح", price: 200, active: true }] },
    "/providers?type=home_care": { status: 200, body: [{ id: "hc-1", name_en: "Care at Home", city: "Riyadh" }] },
    "/care/doctors?specialty=psychiatry": { status: 200, body: [DOCTOR] },
    "/care/doctors?specialty=gynecology": { status: 200, body: [{ ...DOCTOR, id: "doc-gyn-1", name_en: "Dr Bloom" }] },
    "/care/doctors?specialty=nutrition": { status: 200, body: [] },
  };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = `${url.pathname.replace(/^\/api\/v1/, "")}${url.search}`;
    state.calls.push({ url: path, auth: new Headers(init?.headers).get("authorization") });
    const route = state.routes[path];
    return route ? new Response(JSON.stringify(route.body), { status: route.status, headers: { "content-type": "application/json" } }) : new Response("{}", { status: 401 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

const noPersonalReads = () => {
  expect(state.calls.every((call) => call.auth === null)).toBe(true);
  expect(state.calls.map((call) => call.url).filter((url) => /\/(my|me|profile|dashboard|bookings|plan|meals|daily-summary|requests)\b/.test(url))).toEqual([]);
};

describe("guest service pages (issue 1550)", () => {
  it("offers: the public list and a sign-in action that comes back to the offers", async () => {
    const page = await html(await OffersPage({ params }));
    expect(page).toContain("Spring checkup");
    expect(page).toContain("Clinic One");
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/offers")}"`);
    noPersonalReads();
  });

  it("insurance: the insurers and their plans, adding a policy asks for the sign-in", async () => {
    const page = await html(await InsurancePage({ params, searchParams }));
    expect(page).toContain("Insure One");
    expect(page).toContain("Plans: Gold");
    expect(page).not.toContain("private@x.y");
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/insurance/add-policy")}"`);
    noPersonalReads();
  });

  it("home care: services with prices and providers, no bookings read", async () => {
    const page = await html(await HomeCarePage({ params }));
    expect(page).toContain("Wound care");
    expect(page).toContain('href="/en/home-care/services/svc-1"');
    expect(page).toMatch(/SAR|200/);
    expect(page).toContain("Care at Home");
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/home-care")}"`);
    noPersonalReads();
  });

  it("maternity: the gynecology doctors and the tracking action", async () => {
    const page = await html(await MaternityPage({ params, searchParams }));
    expect(page).toContain("Dr Bloom");
    expect(page).toContain('href="/en/consultations/doctors/doc-gyn-1"');
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/maternity/maternity-setup")}"`);
    noPersonalReads();
  });

  it("mental health: the psychiatrists, the always-present 997 urgent-help button and the mood-journal action", async () => {
    const page = await html(await MentalHealthPage({ params }));
    expect(page).toContain("Dr Calm");
    expect(page).toContain('href="tel:997"'); // the urgent-help button: 997 is always there (owner decision 14)
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/mental-health/mood")}"`);
    noPersonalReads();
  });

  it("nutrition: an honest empty doctor list and the plan action", async () => {
    const page = await html(await NutritionPage({ params, searchParams }));
    expect(page).toContain("No doctors are listed yet");
    expect(page).toContain(`href="/en/login?next=${encodeURIComponent("/en/nutrition?tab=plan")}"`);
    noPersonalReads();
  });

  it("a public list the backend cannot give shows the error state with a retry, not an empty list", async () => {
    state.routes["/care/doctors?specialty=psychiatry"] = { status: 503, body: {} };
    const page = await html(await MentalHealthPage({ params }));
    expect(page).toContain("This list could not be loaded");
    expect(page).toContain("Try again");
  });

  it("a signed-in patient still gets the personal page (its reads carry the session)", async () => {
    state.token = "tok-1";
    state.routes["/mental-health/dashboard"] = { status: 200, body: { mood: { total_entries: 3 } } };
    await html(await MentalHealthPage({ params })).catch(() => "");
    expect(state.calls.some((call) => call.url === "/mental-health/dashboard" && call.auth === "Bearer tok-1")).toBe(true);
  });
});

describe("the public map read (issue 1550)", () => {
  it("asks GET /providers/map without a credential and passes the answer on", async () => {
    state.routes["/providers/map"] = { status: 200, body: [{ id: "h-1", name_ar: "مستشفى", lat: 24.7, lng: 46.7 }] };
    const response = await mapProviders();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "h-1", name_ar: "مستشفى", lat: 24.7, lng: 46.7 }]);
    expect(state.calls).toEqual([{ url: "/providers/map", auth: null }]);
  });
});

describe("guest parsers", () => {
  it("keeps the public insurer and plan names only", () => {
    expect(parsePublicInsurers([{ id: "c", name_en: "A", plans: [{ id: "p", name_en: "Gold" }, { id: "x" }] }, { code: "n" }])).toEqual([
      { id: "c", nameAr: undefined, nameEn: "A", plans: [{ id: "p", nameAr: undefined, nameEn: "Gold" }] },
    ]);
  });
  it("drops providers without an id or a name", () => {
    expect(parsePublicProviders([{ id: "1", name_ar: "م" }, { id: "2" }, { name_ar: "x" }])).toEqual([{ id: "1", nameAr: "م", nameEn: undefined, city: undefined }]);
  });
  it("only sends a path of this site back through the sign-in", () => {
    expect(signInHref("ar", "/ar/offers")).toBe("/ar/login?next=%2Far%2Foffers");
    expect(signInHref("ar", "https://evil.example/")).toBe("/ar/login");
  });
});
