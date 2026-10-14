import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announceSignedIn, announceSignedOut, getSessionIdentity, resetSessionIdentityForTests, SIGNED_IN_EVENT, SIGNED_OUT_EVENT } from "./session-identity";

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("the shared session identity", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    resetSessionIdentityForTests();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("asks GET /api/auth/session once however many callers ask, then answers from memory", async () => {
    fetchSpy.mockResolvedValue(answer({ authenticated: true, user: { id: "u1", is_guest: false } }));
    const [a, b] = await Promise.all([getSessionIdentity(), getSessionIdentity()]);
    const c = await getSessionIdentity();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/auth/session");
    for (const identity of [a, b, c]) expect(identity).toEqual({ status: "user", id: "u1", isGuest: false });
  });

  it("is anonymous when the answer says authenticated:false (a 200, not an error)", async () => {
    fetchSpy.mockResolvedValue(answer({ authenticated: false }));
    expect(await getSessionIdentity()).toEqual({ status: "anonymous" });
  });

  it("marks a guest account as such", async () => {
    fetchSpy.mockResolvedValue(answer({ authenticated: true, user: { id: "g1", is_guest: true } }));
    expect(await getSessionIdentity()).toEqual({ status: "user", id: "g1", isGuest: true });
  });

  it("is unknown when the backend is down (network error, 5xx, bad body), and unknown is not remembered", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("down"));
    expect(await getSessionIdentity()).toEqual({ status: "unknown" });
    fetchSpy.mockResolvedValueOnce(answer({ authenticated: false }, 503));
    expect(await getSessionIdentity()).toEqual({ status: "unknown" });
    fetchSpy.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    expect(await getSessionIdentity()).toEqual({ status: "unknown" });
    fetchSpy.mockResolvedValueOnce(answer({ authenticated: true, user: {} })); // a user with no id cannot own a cart
    expect(await getSessionIdentity()).toEqual({ status: "unknown" });
    fetchSpy.mockResolvedValueOnce(answer({ authenticated: false }));
    expect(await getSessionIdentity()).toEqual({ status: "anonymous" }); // asked again, and answered this time
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it("a sign-in announcement forgets the answer, tells listeners, and the next ask goes to the server again", async () => {
    fetchSpy.mockResolvedValueOnce(answer({ authenticated: false }));
    expect(await getSessionIdentity()).toEqual({ status: "anonymous" });
    const heard = vi.fn();
    (window as unknown as EventTarget).addEventListener(SIGNED_IN_EVENT, heard);
    announceSignedIn();
    expect(heard).toHaveBeenCalledTimes(1);
    fetchSpy.mockResolvedValueOnce(answer({ authenticated: true, user: { id: "u9" } }));
    expect(await getSessionIdentity()).toEqual({ status: "user", id: "u9", isGuest: false });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("a sign-out announcement makes the answer anonymous without a request, and a probe that was already in flight cannot bring the old patient back", async () => {
    let release: (response: Response) => void = () => {};
    fetchSpy.mockReturnValueOnce(new Promise<Response>((resolve) => { release = resolve; }));
    const stale = getSessionIdentity(); // asked before the sign-out
    const heard = vi.fn();
    (window as unknown as EventTarget).addEventListener(SIGNED_OUT_EVENT, heard);
    announceSignedOut();
    expect(heard).toHaveBeenCalledTimes(1);
    release(answer({ authenticated: true, user: { id: "u1" } }));
    await stale;
    expect(await getSessionIdentity()).toEqual({ status: "anonymous" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps nothing in browser storage or a cookie, and has no dependency", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(resolve(process.cwd(), "lib/auth/session-identity.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    expect([...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1])).toEqual(["react", "@/lib/auth/session-hint"]); // the hint reader is a local, dependency-free module (issue 363)
  });
});
