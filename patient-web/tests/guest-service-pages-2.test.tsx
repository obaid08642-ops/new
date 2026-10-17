import type { ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Issue 1550, part 2: urgent help, the insurance network, the home care providers, the diagnostics search and lab comparison
// and the AI assistant show their public part to a guest, send no credential and read nothing personal without a session.
const state = vi.hoisted(() => ({ token: undefined as string | undefined, calls: [] as Array<{ url: string; method: string; auth: string | null }>, routes: {} as Record<string, { status: number; body: unknown }> }));

// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not_found"); },
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));
// A guest has no session: the optional read gives nothing and the required one sends the guest to the sign-in, as the real one does.
vi.mock("@/lib/auth/session", () => ({
  getOptionalPatientAccessToken: async () => state.token,
  requirePatientAccess: async (locale: string) => {
    if (!state.token) throw new Error(`redirect:/${locale}/login`);
    return state.token;
  },
}));
vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children }: { children: unknown }) => createElement("div", { "data-shell": true }, children as never) };
});

import EmergencyPage from "@/app/[locale]/emergency/page";
import InsurancePage from "@/app/[locale]/insurance/page";
import InsuranceNetworkRedirect from "@/app/[locale]/insurance/network-providers/page";
import HomeCareProvidersPage from "@/app/[locale]/home-care/providers/page";
import DiagnosticsSearchPage from "@/app/[locale]/diagnostics/search/page";
import LabComparisonPage from "@/app/[locale]/diagnostics/lab-comparison/page";
import AssistantPage from "@/app/[locale]/ai/page";
import OfflinePage from "@/app/[locale]/offline/page";
import ConnectedAppsPage from "@/app/[locale]/settings/connected-apps/page";

async function html(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

const params = Promise.resolve({ locale: "en" });
const query = (value: Record<string, string>) => Promise.resolve(value);
const login = (next: string) => `href="/en/login?next=${encodeURIComponent(next)}"`;

beforeEach(() => {
  state.token = undefined;
  state.calls = [];
  state.routes = {
    "/mental-health/urgent-help": { status: 200, body: { phone: "+966 800 123 4567" } },
    "/insurance/companies": { status: 200, body: [{ id: "co-1", name_en: "Insure One", plans: [{ id: "pl-1", name_en: "Gold" }] }] },
    "/providers?insurance_company=co-1": { status: 200, body: [{ id: "pr-1", name_en: "Network Hospital", type: "hospital" }] },
    "/providers?type=home_care": { status: 200, body: [{ id: "hc-1", name_en: "Care at Home", city: "Riyadh" }] },
    "/labs/services": { status: 200, body: [{ id: "t-1", name: "Vitamin D test", name_ar: "فيتامين د", price: 120 }] },
    "/labs/compatible-providers?testIds=t-1,t-2": { status: 200, body: [{ id: "lab-1", name_en: "Lab One" }] },
  };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://web.test");
    const path = `${url.pathname.replace(/^\/api\/v1/, "")}${url.search}`;
    state.calls.push({ url: path, method: (init?.method || "GET").toUpperCase(), auth: new Headers(init?.headers).get("authorization") });
    const route = state.routes[path];
    return route ? new Response(JSON.stringify(route.body), { status: route.status, headers: { "content-type": "application/json" } }) : new Response("{}", { status: 401 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

/** Every read of a guest page is a GET without a credential, and none is one of the patient's own. */
const noPersonalReads = () => {
  expect(state.calls.filter((call) => call.auth !== null || call.method !== "GET")).toEqual([]);
  expect(state.calls.map((call) => call.url).filter((url) => /\/(my|me|profile|dashboard|bookings|requests|agent-connections|home-care\/providers)\b/.test(url))).toEqual([]);
};

describe("guest service pages, part 2 (issue 1550)", () => {
  it("emergency: the urgent-help number is a tel: button for a guest, and sharing the location asks for the sign-in", async () => {
    const page = await html(await EmergencyPage({ params }));
    expect(page).toContain('href="tel:+9668001234567"');
    expect(page).toContain("+966 800 123 4567");
    expect(page).toContain(login("/en/emergency"));
    expect(page).not.toContain("Send my location to my family</span></button>");
    noPersonalReads();
  });

  it("emergency signed in: the share-location button, no sign-in card", async () => {
    state.token = "tok-1";
    const page = await html(await EmergencyPage({ params }));
    expect(page).toContain('href="tel:+9668001234567"');
    expect(page).toContain("Send my location to my family");
    expect(page).not.toContain("/en/login?next=");
  });

  it("insurance network: the old URL opens the network tab, where a guest picks an insurer and sees its network", async () => {
    await expect(InsuranceNetworkRedirect({ params, searchParams: query({ company: "co-1" }) })).rejects.toThrow("redirect:/en/insurance?tab=network&company=co-1");
    const page = await html(await InsurancePage({ params, searchParams: query({ tab: "network", company: "co-1" }) }));
    expect(page).toContain("Insure One");
    expect(page).toContain("Network Hospital");
    expect(page).toContain(login("/en/insurance/add-policy"));
    expect(state.calls.some((call) => call.url === "/providers?insurance_company=co-1")).toBe(true);
    noPersonalReads();
  });

  it("insurance network: an insurer that is not on the public list is not read", async () => {
    await html(await InsurancePage({ params, searchParams: query({ tab: "network", company: "../users/me" }) }));
    expect(state.calls.map((call) => call.url)).toEqual(["/insurance/companies"]);
  });

  it("home care providers: the published providers and a sign-in action back to home care", async () => {
    const page = await html(await HomeCareProvidersPage({ params }));
    expect(page).toContain("Care at Home");
    expect(page).toContain("Riyadh");
    expect(page).toContain(login("/en/home-care"));
    noPersonalReads();
  });

  it("home care providers signed in: the patient read still carries the session", async () => {
    state.token = "tok-1";
    state.routes["/home-care/providers"] = { status: 200, body: [{ id: "hc-2", name_en: "Nurse Team", provider_type: "nursing" }] };
    const page = await html(await HomeCareProvidersPage({ params }));
    expect(page).toContain("Nurse Team");
    expect(state.calls).toEqual([{ url: "/home-care/providers", method: "GET", auth: "Bearer tok-1" }]);
  });

  it("diagnostics search: the public test list without a credential", async () => {
    const page = await html(await DiagnosticsSearchPage({ params, searchParams: query({ q: "vit" }) }));
    expect(page).toContain("Vitamin D test");
    noPersonalReads();
  });

  it("lab comparison: the labs that run the chosen tests, without a credential", async () => {
    const page = await html(await LabComparisonPage({ params, searchParams: query({ testIds: "t-1,t-2" }) }));
    expect(page).toContain("Lab One");
    expect(page).toContain('href="/en/diagnostics/labs/lab-1"');
    noPersonalReads();
  });

  it("AI assistant: a guest sees what each mode does and signs in to ask, coming back to the same mode", async () => {
    const page = await html(await AssistantPage({ params, searchParams: query({ mode: "prescription" }) }));
    expect(page).toContain("Explain my prescription");
    expect(page).toContain('href="/en/ai?mode=symptoms"');
    expect(page).toContain(login("/en/ai?mode=prescription"));
    expect(state.calls).toEqual([]);
  });

  it("AI assistant signed in: the assistant form, no sign-in card", async () => {
    state.token = "tok-1";
    const page = await html(await AssistantPage({ params, searchParams: query({ mode: "symptoms" }) }));
    expect(page).toContain("Find the next step");
    expect(page).not.toContain("/en/login?next=");
  });
});

describe("the two pages the crawl reported as 404 (issue 1550)", () => {
  it("/offline is a static page with the state card and the way home, translated", async () => {
    const page = await html(await OfflinePage({ params }));
    expect(page).toContain("You are offline");
    expect(page).toContain('href="/en"');
    expect(state.calls).toEqual([]);
  });

  it("/settings/connected-apps is the patient's own list: a guest goes to the sign-in, a patient gets the page", async () => {
    await expect(ConnectedAppsPage({ params })).rejects.toThrow("redirect:/en/login");
    expect(state.calls).toEqual([]);
    state.token = "tok-1";
    state.routes["/patient/agent-connections"] = { status: 200, body: [] };
    const page = await html(await ConnectedAppsPage({ params }));
    expect(page).toContain("data-shell");
    expect(state.calls).toEqual([{ url: "/patient/agent-connections", method: "GET", auth: "Bearer tok-1" }]);
  });
});
