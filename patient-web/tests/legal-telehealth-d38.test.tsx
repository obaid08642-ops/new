import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D-38 (issue 1549): the cancellation and refund policy and the telehealth consent are site pages read from the legal
 * service like /terms; an online booking or call refused for a missing telehealth consent shows the consent, and the
 * acceptance goes through the site's own route with the device and the platform.
 */

const translate = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key);
vi.mock("next-intl/server", () => ({ getTranslations: async () => translate, setRequestLocale: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => translate }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
const api = vi.fn();
const cookieValues: Record<string, string | undefined> = {};
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (cookieValues[name] ? { value: cookieValues[name] } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...a: unknown[]) => api(...a) }));

import RefundPolicyPage from "../app/[locale]/refund-policy/page";
import TelehealthConsentPage from "../app/[locale]/telehealth-consent/page";
import { POST as accept } from "../app/api/legal/accept/[key]/route";
import { TelehealthConsentCard, needsTelehealthConsent } from "@/components-next/consult/telehealth-consent-card";
import { authCookieNames } from "@/lib/auth/cookies";

const answer = (body: unknown, status = 200) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
type AsyncElement = { type: (p: unknown) => Promise<React.ReactElement>; props: unknown };

describe("the refund policy and telehealth consent pages", () => {
  it.each([
    ["refund_policy", RefundPolicyPage, "legal.refund"],
    ["telehealth_consent", TelehealthConsentPage, "legal.telehealth"],
  ] as const)("%s: the page draws the legal service's text with its version, and a 4xx is a 404", async (key, Page, title) => {
    answer({ content: "# TEST heading\n\nTEST text\n\n• TEST point", version: "1.0", effective_date: "2026-01-05T00:00:00Z" });
    const element = (await Page({ params: Promise.resolve({ locale: "en" }) })) as AsyncElement;
    const html = renderToStaticMarkup(await element.type(element.props));
    const fetchMock = vi.mocked(fetch);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/legal/policy/${key}?lang=en`);
    expect(html).toContain("TEST heading");
    expect(html).toContain("TEST point");
    expect(html).toContain(title);
    expect(html).toContain("legal.version:1.0,");
    answer({}, 404);
    await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("an Arabic page asks for the Arabic text, every other language for the English one (the /terms fallback)", async () => {
    answer({ content: "نص", version: "1.0" });
    await RefundPolicyPage({ params: Promise.resolve({ locale: "ar" }) });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/legal/policy/refund_policy?lang=ar");
    answer({ content: "text", version: "1.0" });
    await RefundPolicyPage({ params: Promise.resolve({ locale: "ur" }) });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/legal/policy/refund_policy?lang=en");
  });
});

describe("the telehealth consent in the booking", () => {
  it("knows the server's refusal", () => {
    expect(needsTelehealthConsent({ message: "telehealth_consent_required" })).toBe(true);
    expect(needsTelehealthConsent({ statusCode: 400, message: "x", code: "telehealth_consent_required" })).toBe(true);
    expect(needsTelehealthConsent({ message: "slot_taken" })).toBe(false);
    expect(needsTelehealthConsent(null)).toBe(false);
  });

  it("shows the consent text, its version, the full page link and the accept button", () => {
    const consent = { blocks: [{ kind: "heading" as const, text: "TEST title" }, { kind: "bullet" as const, text: "TEST one" }, { kind: "bullet" as const, text: "TEST two" }], version: "1.0", lang: "ar" as const };
    const html = renderToStaticMarkup(<TelehealthConsentCard locale="en" consent={consent} onAccepted={() => undefined} />);
    expect(html).toContain("TEST title");
    expect(html.match(/<li>/g)?.length).toBe(2);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("version:1.0");
    expect(html).toContain('href="/en/telehealth-consent"');
    expect(html).toContain("accept");
    expect(html).not.toMatch(/style=|#[0-9a-fA-F]{6}\b/);
  });

  it("without a readable text it still links the full page", () => {
    const html = renderToStaticMarkup(<TelehealthConsentCard locale="ur" consent={null} onAccepted={() => undefined} />);
    expect(html).toContain('href="/ur/telehealth-consent"');
  });
});

describe("POST /api/legal/accept/:key", () => {
  beforeEach(() => {
    api.mockReset();
    cookieValues[authCookieNames.access] = "token";
    cookieValues[authCookieNames.device] = "web-device-1";
  });
  const call = (key: string) => accept(new Request(`http://x/api/legal/accept/${key}`, { method: "POST", headers: { "user-agent": "TEST browser" } }), { params: Promise.resolve({ key }) });

  it("accepts the telehealth consent with the device, the platform and an idempotency key", async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ ok: true, accepted: true, version: "1.0" }), { status: 201 }));
    const res = await call("telehealth_consent");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: "1.0" });
    const [path, init, token] = api.mock.calls[0] as [string, RequestInit, string];
    expect(path).toBe("/legal/accept/telehealth_consent");
    expect(token).toBe("token");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-device-id"]).toBe("web-device-1");
    expect(headers["x-app-platform"]).toBe("web");
    expect(headers["idempotency-key"]).toMatch(/^legal-telehealth_consent-/);
  });

  it("accepts nothing else from the site, and needs a session", async () => {
    expect((await call("patient_terms")).status).toBe(404);
    expect(api).not.toHaveBeenCalled();
    cookieValues[authCookieNames.access] = undefined;
    expect((await call("telehealth_consent")).status).toBe(401);
  });

  it("passes the server's refusal on, bounded", async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ message: "policy_not_found" }), { status: 400 }));
    const res = await call("telehealth_consent");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "policy_not_found" });
  });
});
