import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
// the real en messages through the real ICU translator, so a missing key or a bad message fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return {
    getTranslations: async (arg: string | { locale?: string; namespace?: string }) =>
      actual.createTranslator({ locale: "en", messages: messages as never, namespace: (typeof arg === "string" ? arg : arg.namespace) as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => <div data-shell data-title={title} data-back={backHref}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import EmergencyPage from "@/app/[locale]/emergency/page";
import SosRedirect from "@/app/[locale]/emergency/sos/page";
import SosActiveRedirect from "@/app/[locale]/emergency/sos-active/page";
import TrackingRedirect from "@/app/[locale]/emergency/tracking/page";
import { parseUrgentHelp } from "@/lib/api/urgent-help";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";

/**
 * Owner decision 14 (2026-10-10): the one urgent-help page. Every value is a TEST value. What is proved: the number comes from
 * GET /mental-health/urgent-help (never from the code), a number gives a `tel:` button, no number gives no button and an honest
 * message, a failed read gives the error state, and the removed SOS routes redirect to /emergency.
 */

const params = Promise.resolve({ locale: "en" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const html = async (element: Promise<ReactNode>) => renderToStaticMarkup((await element) as ReactNode);
async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return String((error as Error).message).replace(/^redirect:/, "");
  }
  throw new Error("no redirect");
}

beforeEach(() => server.api.mockReset());

describe("parseUrgentHelp", () => {
  it("reads a dialable number and nothing else", () => {
    expect(parseUrgentHelp({ phone: " +966 11 555 0100 ", updated_at: null })).toEqual({ phone: "+966 11 555 0100", dial: "+966115550100" });
    expect(parseUrgentHelp({ data: { phone: "920012345" } })).toEqual({ phone: "920012345", dial: "920012345" });
    for (const bad of [{ phone: null }, { phone: "" }, { phone: "javascript:alert(1)" }, { phone: "12" }, null, "x"]) expect(parseUrgentHelp(bad)).toBeNull();
  });
});

describe("the urgent-help page", () => {
  it("shows a tel button with the number from the config", async () => {
    server.api.mockResolvedValue(json({ phone: "+966115550100", updated_at: "2026-10-01T00:00:00Z" }));
    const out = await html(EmergencyPage({ params }));
    expect(server.api).toHaveBeenCalledWith("/mental-health/urgent-help");
    expect(out).toContain('href="tel:+966115550100"');
    expect(out).toContain("Call");
    expect(out).toContain("+966115550100");
    expect(out).not.toContain("has been set up yet");
  });

  it("shows no button and an honest message when the config has no number", async () => {
    server.api.mockResolvedValue(json({ phone: null, updated_at: null }));
    const out = await html(EmergencyPage({ params }));
    expect(out).not.toContain("tel:");
    expect(out).toContain("No urgent-help number has been set up yet");
  });

  it("shows the error state, not a button, when the config cannot be read", async () => {
    server.api.mockResolvedValue(new Response(null, { status: 503 }));
    const out = await html(EmergencyPage({ params }));
    expect(out).not.toContain("tel:");
    expect(out).toContain("could not be loaded");
  });
});

describe("the removed SOS routes and calls", () => {
  it.each([
    ["sos", SosRedirect],
    ["sos-active", SosActiveRedirect],
    ["tracking", TrackingRedirect],
  ])("/emergency/%s redirects to /emergency", async (_name, Page) => {
    expect(await redirectOf(() => Page({ params }))).toBe("/en/emergency");
  });

  it("no longer lets the browser trigger, cancel, read or track an SOS through the proxy", () => {
    expect(isAllowedPatientApiRequest("/orders/mine", "GET")).toBe(true); // the check is live
    expect(isAllowedPatientApiRequest("/emergency/trigger", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/emergency/abc123/cancel", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/emergency/my/active", "GET")).toBe(false);
    expect(isAllowedPatientApiRequest("/emergency/tracking", "GET")).toBe(false);
  });
});
