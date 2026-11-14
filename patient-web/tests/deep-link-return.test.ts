import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PT-38 (web half): a link to a booking or a chat, opened signed out, sends the person to the sign-in and brings them back to that exact page.
 * The chain under test is the real one: proxy.ts remembers the page in `x-nabd-path`, requirePatientAccess() (lib/auth/session.ts) puts it in `?next=`, and safeNextPath()
 * decides what may come back. next-intl's middleware, cookies() and headers() are the only stand-ins. IDs are TEST values.
 */
const seen = vi.hoisted(() => ({ request: null as null | Request, cookie: undefined as string | undefined, headerValue: null as string | null }));

vi.mock("next-intl/middleware", () => ({ default: () => (req: Request) => { seen.request = req; return new Response(); } }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (seen.cookie ? { value: seen.cookie } : undefined) }),
  headers: async () => ({ get: (name: string) => (name === "x-nabd-path" ? seen.headerValue : null) }),
}));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));

import { proxy } from "../proxy";
import { requirePatientAccess } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/safe-next";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];
const ID = "3f8c1d2e-9a41-4c7b-8e55-0b6f2a7d9c10";
const PAGES = (l: string) => [
  `/${l}/appointments/${ID}`,
  `/${l}/appointments/${ID}?pay=1`,
  `/${l}/chat/${ID}`,
  `/${l}/consultations/booking-status?appointmentId=${ID}`,
];

/** What the browser asked for -> what the sign-in redirect says (the whole chain, signed out). */
async function signedOutRedirect(path: string): Promise<string> {
  seen.request = null;
  await proxy(new NextRequest(new URL(path, "https://nabd.plus")));
  seen.headerValue = seen.request ? (seen.request as Request).headers.get("x-nabd-path") : null;
  seen.cookie = undefined;
  const locale = path.split("/")[1];
  try { await requirePatientAccess(locale); } catch (e) { return (e as Error).message.replace(/^redirect:/, ""); }
  return "no redirect";
}

describe("proxy remembers the page; the sign-in brings the person back to it", () => {
  beforeEach(() => { seen.request = null; seen.cookie = undefined; seen.headerValue = null; });

  for (const locale of LOCALES) {
    it(`${locale}: booking and chat links go to /${locale}/login?next=<that exact page>`, async () => {
      for (const page of PAGES(locale)) {
        expect(await signedOutRedirect(page)).toBe(`/${locale}/login?next=${encodeURIComponent(page)}`);
      }
    });
  }

  it("signed in (an access cookie), the same pages are not redirected", async () => {
    for (const page of PAGES("ar")) {
      seen.request = null;
      await proxy(new NextRequest(new URL(page, "https://nabd.plus")));
      seen.headerValue = (seen.request as unknown as Request).headers.get("x-nabd-path");
      seen.cookie = "access-token-test-value";
      await expect(requirePatientAccess("ar")).resolves.toBe("access-token-test-value");
    }
  });

  it("the way back survives a round trip through the sign-in page", async () => {
    const page = `/en/appointments/${ID}?pay=1`;
    const redirect = await signedOutRedirect(page);
    const next = new URL(redirect, "https://nabd.plus").searchParams.get("next");
    expect(safeNextPath(next)).toBe(page);
  });
});

describe("what may come back after the sign-in (no open redirect through a deep link)", () => {
  it("keeps this site's booking and chat paths in every locale, with their query", () => {
    for (const l of LOCALES) for (const p of PAGES(l)) expect(safeNextPath(p)).toBe(p);
  });

  it("drops anything that leaves the site or loops back into the sign-in", () => {
    for (const bad of [
      "https://evil.example/ar/appointments/1", "//evil.example/ar/chat/1", "/\\evil.example", "javascript:alert(1)", "/ar/appointments/1\r\nSet-Cookie: x=1",
      "/ar/login?next=/ar/chat/1", "/ar/register", "/appointments/1", "/xx/chat/1", "", null, undefined, "/" + "a".repeat(3000),
    ]) expect(safeNextPath(bad as string)).toBeNull();
  });

  it("an unsafe remembered path gives the plain sign-in, not a broken ?next=", async () => {
    seen.headerValue = "//evil.example/ar/chat/1"; seen.cookie = undefined;
    await expect(requirePatientAccess("ar")).rejects.toThrow("redirect:/ar/login");
    await expect(requirePatientAccess("ar")).rejects.not.toThrow("next=");
  });
});
