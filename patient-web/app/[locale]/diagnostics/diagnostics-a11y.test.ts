import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getDiagnosticBookings: vi.fn(), getDiagnosticBooking: vi.fn(), getDiagnosticTracking: vi.fn(), requirePatientAccess: vi.fn(), labs: vi.fn(), radiology: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
// the real en messages, so a missing key fails here
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: string | { namespace: string }) => createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => createElement("div", { "data-shell": true, "data-title": title, "data-back": backHref }, children),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["en"] }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking, getDiagnosticTracking: state.getDiagnosticTracking }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.labs }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.radiology }));
vi.mock("@/components-next/nav/stale-while-revalidate", () => ({ StaleWhileRevalidate: () => null }));

import DiagnosticsPage from "./page";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-diagnostic-token-never-in-html";
const reportUrl = "https://example.test/private-report.pdf";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const hub = async (searchParams: Record<string, string> = {}) => renderToStaticMarkup(await DiagnosticsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(searchParams) }));


/** Links and buttons of the markup with no text, aria-label, aria-labelledby or title (an image alt counts as text). */
function unnamedControls(html: string): string[] {
  const out: string[] = [];
  for (const match of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const [whole, , attrs, inner] = match;
    if (/\b(aria-label|title)="[^"]*\S[^"]*"/.test(attrs) || /\baria-labelledby="[^"]+"/.test(attrs)) continue;
    if (/<img\b[^>]*\balt="[^"]*\S[^"]*"/.test(inner)) continue;
    const text = inner.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!text) out.push(whole.slice(0, 160));
  }
  return out;
}

describe("diagnostics hub accessible names", () => {
  beforeEach(() => {
    state.getDiagnosticBookings.mockReset().mockResolvedValue(json([]));
    state.requirePatientAccess.mockReset().mockRejectedValue(new Error("no session"));
    state.labs.mockReset().mockResolvedValue(json([{ id: "cbc", name_en: "CBC", price: 20 }, { id: "tsh", name_en: "TSH" }]));
    state.radiology.mockReset().mockResolvedValue(json([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", price: 90, image_url: "https://cdn.nabd.plus/radiology/hsg.png" }]));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: unknown) => (String(url).includes("/providers") ? json([{ id: "lab-1", name_en: "Lab One", rating: 4.5 }]) : json([{ id: "pkg-1", name_en: "Wellness panel", price: 120, included_services: ["cbc"] }]))));
  });
  it.each([{}, { kind: "radiology" }])("every link and button of the hub %j has a name", { timeout: 30_000 }, async (query) => {
    const html = await hub(query as Record<string, string>);
    expect(unnamedControls(html)).toEqual([]);
  });
});
