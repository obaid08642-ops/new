// F82-3: who is looking is decided in the browser, once per page load, by one shared store.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children?: unknown; className?: string }) => <a href={href} className={rest.className}>{children as never}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { __resetSessionIdentityForTests, loadSessionIdentity, peekSessionIdentity, resetSessionIdentity } from "@/lib/auth/session-identity";
import { HomeAccountTools, HomeNavLink, HomeNotificationsLink } from "@/components-next/home/home-identity";
import { SessionActions } from "@/components-next/session-actions";

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  __resetSessionIdentityForTests();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** The status the store holds once the shared request settled (a hook reads the same value after hydration). */
async function settled() {
  return peekSessionIdentity().status;
}

describe("the session identity store", () => {
  it("asks the server once, however many components ask, with no-store and the cookie of this origin", async () => {
    fetchMock.mockResolvedValue(answer({ authenticated: false }));
    await Promise.all([loadSessionIdentity(), loadSessionIdentity(), loadSessionIdentity()]);
    await loadSessionIdentity();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", expect.objectContaining({ method: "GET", cache: "no-store", credentials: "same-origin" }));
    expect(fetchMock.mock.calls.every(([url]) => url === "/api/auth/session")).toBe(true);
  });

  it("starts unknown, which is also what the server HTML and the first client render show", async () => {
    expect(await settled()).toBe("unknown");
  });

  it("knows a signed-in visitor and an anonymous one", async () => {
    fetchMock.mockResolvedValue(answer({ authenticated: true, user: { id: "u1" } }));
    await loadSessionIdentity();
    expect(await settled()).toBe("authenticated");
    __resetSessionIdentityForTests();
    fetchMock.mockResolvedValue(answer({ authenticated: false }));
    await loadSessionIdentity();
    expect(await settled()).toBe("anonymous");
  });

  it("treats a failed request or an error answer as anonymous (it never claims a session it did not see)", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await loadSessionIdentity();
    expect(await settled()).toBe("anonymous");
    __resetSessionIdentityForTests();
    fetchMock.mockResolvedValue(answer({ authenticated: true }, 502));
    await loadSessionIdentity();
    expect(await settled()).toBe("anonymous");
  });

  it("forgets the answer when the person signs in or out, and does not ask again until a component needs it", async () => {
    fetchMock.mockResolvedValue(answer({ authenticated: false }));
    await loadSessionIdentity();
    resetSessionIdentity();
    expect(await settled()).toBe("unknown");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValue(answer({ authenticated: true }));
    await loadSessionIdentity();
    expect(await settled()).toBe("authenticated");
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
