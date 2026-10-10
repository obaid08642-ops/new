import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { clearSessionCookies, setSessionCookies } from "./cookies";
import { getSessionIdentity, resetSessionIdentityForTests } from "./session-identity";
import { hintFromAccessToken, parseSessionHint, readSessionHintFromDocument, serializeSessionHint, SESSION_HINT_COOKIE } from "./session-hint";

const jwt = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

describe("the readable session hint (issue 363)", () => {
  it("round-trips a patient, a guest and an anonymous answer", () => {
    for (const hint of [{ kind: "anonymous" }, { kind: "user", id: "u1", isGuest: false }, { kind: "user", id: "g-2", isGuest: true }] as const) {
      expect(parseSessionHint(serializeSessionHint(hint))).toEqual(hint);
    }
  });

  it("rejects values that are not a hint", () => {
    for (const value of [null, "", "x", "p.", "p.a b", "q.u1", "p.<script>"]) expect(parseSessionHint(value)).toBeNull();
  });

  it("takes the id and the guest flag from the token payload and never keeps the token", () => {
    expect(hintFromAccessToken(jwt({ sub: "u9", is_guest: false }))).toEqual({ kind: "user", id: "u9", isGuest: false });
    expect(hintFromAccessToken(jwt({ sub: "g9", is_guest: true }))).toEqual({ kind: "user", id: "g9", isGuest: true });
    expect(hintFromAccessToken("not-a-token")).toBeNull();
  });

  it("is set readable (not HttpOnly) next to the session cookies, holds no token, and says nobody once they are cleared", () => {
    const response = NextResponse.json({});
    const access = jwt({ sub: "u1", is_guest: false });
    setSessionCookies(response, { accessToken: access, refreshToken: "r" }, "dev");
    const hint = response.cookies.get(SESSION_HINT_COOKIE);
    expect(hint?.value).toBe("p.u1");
    expect(hint?.httpOnly).toBeFalsy();
    expect(response.cookies.get("nabd_access")?.httpOnly).toBe(true);
    expect(hint?.value).not.toContain(access);
    clearSessionCookies(response);
    expect(response.cookies.get(SESSION_HINT_COOKIE)?.value).toBe("n");
    expect(response.cookies.get("nabd_access")?.value).toBe("");
  });

  describe("in the browser", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      resetSessionIdentityForTests();
      fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      vi.stubGlobal("window", new EventTarget());
    });
    afterEach(() => vi.unstubAllGlobals());

    it("answers from the cookie without calling /api/auth/session", async () => {
      vi.stubGlobal("document", { cookie: `a=1; ${SESSION_HINT_COOKIE}=p.u1; b=2` });
      expect(readSessionHintFromDocument()).toEqual({ kind: "user", id: "u1", isGuest: false });
      expect(await getSessionIdentity()).toEqual({ status: "user", id: "u1", isGuest: false });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("asks the server only when there is no hint", async () => {
      vi.stubGlobal("document", { cookie: "a=1" });
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
      expect(await getSessionIdentity()).toEqual({ status: "anonymous" });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
