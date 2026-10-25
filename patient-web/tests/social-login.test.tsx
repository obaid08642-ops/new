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
  // Owner, 2026-10-25: all four always show (the providers review the live button before they approve the app);
  // a provider the server has no keys for answers "not available" on tap, and data-configured says which are live.
  it("shows all four, not configured, when nothing is configured", () => {
    const html = render({});
    expect(html).toContain("Or continue with");
    for (const label of ["Google</button>", " Apple</button>", "X</button>", "Snapchat</button>"]) expect(html).toContain(label);
    expect(html).not.toContain('data-configured="1"');
  });
  it("shows all four when the backend enables them", () => {
    const html = render(ALL);
    expect(html).toContain("Google</button>");
    expect(html).toContain(" Apple</button>");
    expect(html).toContain("X</button>");
    expect(html).toContain("Snapchat</button>");
  });
  it.each([["google", /data-configured="0"><svg[^>]*>(?:<path[^>]*><\/path>)+<\/svg> Google<\/button>/], ["apple", /data-configured="0"><svg[^>]*>(?:<path[^>]*><\/path>)+<\/svg> Apple<\/button>/], ["x", /data-configured="0"><svg[^>]*>(?:<path[^>]*><\/path>)+<\/svg> X<\/button>/], ["snapchat", /data-configured="0"><svg[^>]*>(?:<path[^>]*><\/path>)+<\/svg> Snapchat<\/button>/]] as const)("%s stays visible but not configured when the backend does not enable it", (provider, pattern) => {
    const { [provider]: _removed, ...rest } = ALL;
    const html = render(rest);
    expect(html).toMatch(pattern);
    expect((html.match(/data-configured="1"/g) ?? []).length).toBe(3);
  });
});

describe("brand look of the buttons (owner, 2026-10-25)", () => {
  it("draws the four-colour Google G, and gives each provider its own brand class", () => {
    const html = render(ALL);
    for (const fill of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(html).toContain(`fill="${fill}"`);
    for (const brand of ["Google", "Apple", "X", "Snapchat"]) expect(html).toContain(`socialBrandButton socialBrand${brand}`);
  });
  it("keeps the CSS brand colours equal to social-brands.ts", async () => {
    const { SOCIAL_BUTTON_COLORS } = await import("@/components-next/ui-generated/icons/social-brands");
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("components-next/ui-generated/icons/social-brands.css", "utf8");
    for (const [brand, themes] of Object.entries(SOCIAL_BUTTON_COLORS)) {
      const name = brand === "x" ? "X" : brand[0].toUpperCase() + brand.slice(1);
      const light = css.match(new RegExp(`^\\.socialBrand${name} \\{ --sb-bg: (#\\w+); --sb-fg: (#\\w+); --sb-border: (#\\w+); \\}`, "m"));
      expect(light?.slice(1)).toEqual([themes.light.background, themes.light.foreground, themes.light.border]);
      expect(css).toContain(`--sb-bg: ${themes.dark.background}`);
    }
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
