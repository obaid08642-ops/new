import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { SocialLoginButtons } from "../components-next/social-login-buttons";
import { acceptCallback, authorizeUrl, codeChallenge, newPkce, randomUrlSafe, xSnapchatEnabled } from "../lib/auth/social-oauth";

const ALL = ["NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_APPLE_CLIENT_ID", "NEXT_PUBLIC_APPLE_REDIRECT_URI", "NEXT_PUBLIC_X_CLIENT_ID", "NEXT_PUBLIC_SNAPCHAT_CLIENT_ID", "NEXT_PUBLIC_SOCIAL_X_SNAPCHAT"];
afterEach(() => vi.unstubAllEnvs());
const render = () => renderToStaticMarkup(<SocialLoginButtons locale="en" />);

describe("social sign-in buttons are shown per configuration", () => {
  it("shows only guest sign-in when nothing is configured", () => {
    ALL.forEach((k) => vi.stubEnv(k, ""));
    const html = render();
    expect(html).not.toMatch(/>(Google|Apple|X|Snapchat)</);
    expect(html).not.toContain("Or continue with");
  });
  it("shows Google and Apple when configured", () => {
    ALL.forEach((k) => vi.stubEnv(k, ""));
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "g");
    vi.stubEnv("NEXT_PUBLIC_APPLE_CLIENT_ID", "a");
    vi.stubEnv("NEXT_PUBLIC_APPLE_REDIRECT_URI", "https://x.test/cb");
    const html = render();
    expect(html).toContain("Google</button>");
    expect(html).toContain(">Apple</button>");
    expect(html).not.toContain(">Snapchat</button>");
  });
  it("hides X and Snapchat without the gate even with client ids, and shows them with it", () => {
    ALL.forEach((k) => vi.stubEnv(k, ""));
    vi.stubEnv("NEXT_PUBLIC_X_CLIENT_ID", "x");
    vi.stubEnv("NEXT_PUBLIC_SNAPCHAT_CLIENT_ID", "s");
    expect(render()).not.toMatch(/>(X|Snapchat)<\/button>/);
    vi.stubEnv("NEXT_PUBLIC_SOCIAL_X_SNAPCHAT", "1");
    const html = render();
    expect(html).toContain("X</button>");
    expect(html).toContain("Snapchat</button>");
  });
  it("the gate is exactly '1'", () => {
    expect(xSnapchatEnabled("1")).toBe(true);
    for (const v of [undefined, "", "0", "true"]) expect(xSnapchatEnabled(v)).toBe(false);
  });
});

describe("PKCE helper", () => {
  it("makes a URL-safe verifier of at least 43 characters and the S256 challenge of it", async () => {
    const p = await newPkce();
    expect(p.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(p.challenge).toBe(createHash("sha256").update(p.verifier).digest("base64url"));
    expect(await codeChallenge("abc")).toBe(createHash("sha256").update("abc").digest("base64url"));
    expect(randomUrlSafe()).not.toBe(randomUrlSafe());
    expect(p.state).not.toBe((await newPkce()).state);
  });
  it("builds the authorize URL with state and S256", async () => {
    const p = await newPkce();
    const u = new URL(authorizeUrl("x", "cid", "https://w.test/en/login/social-callback", p));
    expect(u.origin + u.pathname).toBe("https://twitter.com/i/oauth2/authorize");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ response_type: "code", client_id: "cid", state: p.state, code_challenge: p.challenge, code_challenge_method: "S256" });
    expect(authorizeUrl("snapchat", "c", "https://w.test/cb", p)).toContain("accounts.snapchat.com/accounts/oauth2/auth");
  });
  it("accepts the callback only with the expected state", () => {
    const ok = { type: "nabd-social-callback", code: "c1", state: "s1" };
    expect(acceptCallback("s1", ok)).toBe("c1");
    expect(acceptCallback("other", ok)).toBeNull();
    expect(acceptCallback("s1", { ...ok, type: "x" })).toBeNull();
    expect(acceptCallback("s1", { ...ok, code: "" })).toBeNull();
    expect(acceptCallback("s1", null)).toBeNull();
  });
});
