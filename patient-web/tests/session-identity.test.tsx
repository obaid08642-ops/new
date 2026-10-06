// F82-3: who is looking is decided in the browser, once per page load, by one shared store.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children?: unknown; className?: string }) => <a href={href} className={rest.className}>{children as never}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { getSessionIdentity, resetSessionIdentityForTests } from "@/lib/auth/session-identity";
import { HomeAccountTools, HomeNavLink, HomeNotificationsLink } from "@/components-next/home/home-identity";
import { SessionActions } from "@/components-next/session-actions";

// The store itself (one shared request, unknown not remembered, sign-in/out announcements) is tested in lib/auth/session-identity.test.ts.
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetSessionIdentityForTests();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("the session identity request", () => {
  it("is made by the browser, with no-store and the cookie of this origin (the cached HTML never holds the answer)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
    await Promise.all([getSessionIdentity(), getSessionIdentity()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", expect.objectContaining({ cache: "no-store", credentials: "same-origin" }));
  });
});

describe("the neutral state (what the static HTML contains)", () => {
  it("the Home top bar parts hold no per-user target and take the room of the sign-in button", () => {
    const html = renderToStaticMarkup(
      <>
        <HomeNavLink locale="en" label="Home" />
        <HomeNotificationsLink locale="en" label="Notifications" />
        <HomeAccountTools locale="en" signInLabel="Sign in" accountLabel="Account" />
      </>,
    );
    expect(html).toContain('href="/en"');
    expect(html).not.toContain("/dashboard");
    expect(html).not.toContain("/login");
    expect(html).not.toContain("/profile");
    expect(html).not.toContain("/notifications");
    expect(html).toMatch(/<span class="[^"]*signIn[^"]*identityPending[^"]*" aria-hidden="true">Sign in<\/span>/);
  });

  it("the layout's account controls render nothing until the browser knows there is a session", () => {
    expect(renderToStaticMarkup(<SessionActions locale="en" accountLabel="Account" signOutLabel="Sign out" />)).toBe("");
  });
});
