import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { SocialLoginButtons } from "../components-next/social-login-buttons";
import { acceptCallback, authorizeUrl, codeChallenge, newPkce, randomUrlSafe } from "../lib/auth/social-oauth";

import type { SocialButtons } from "../lib/auth/social-config";

const render = (social: SocialButtons) => renderToStaticMarkup(<SocialLoginButtons locale="en" social={social} />);
const ALL: SocialButtons = {
  google: { clientId: "g" },
  apple: { clientId: "a", redirectUri: "https://x.test/cb" },
  x: { clientId: "x" },
  snapchat: { clientId: "s" },
};

describe("social sign-in buttons are shown per configuration", () => {
  it("shows only guest sign-in when nothing is configured", () => {
    const html = render({});
    expect(html).not.toMatch(/>(Google|Apple|X|Snapchat)</);
    expect(html).not.toContain("Or continue with");
  });
  it("shows all four when the backend enables them", () => {
    const html = render(ALL);
    expect(html).toContain("Google</button>");
    expect(html).toContain(">Apple</button>");
    expect(html).toContain("X</button>");
    expect(html).toContain("Snapchat</button>");
  });
  it.each([["google", /Google<\/button>/], ["apple", />Apple<\/button>/], ["x", /X<\/button>/], ["snapchat", /Snapchat<\/button>/]] as const)("%s is hidden when the backend does not enable it", (provider, pattern) => {
    const { [provider]: _removed, ...rest } = ALL;
    expect(render(rest)).not.toMatch(pattern);
    for (const other of Object.keys(rest)) expect(render(rest)).toContain(other === "google" ? "Google</button>" : other === "apple" ? ">Apple</button>" : other === "x" ? "X</button>" : "Snapchat</button>");
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
