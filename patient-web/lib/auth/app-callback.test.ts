import { describe, expect, it } from "vitest";
import { APP_CALLBACK_TARGET, appCallbackTarget } from "./app-callback";
import { authorizeUrl, CODE_PROVIDERS, newPkce } from "./social-oauth";

describe("Snapchat bridge page: where it may send the browser", () => {
  it("hands code and state to nabdplus://login/app-callback, encoded, and nowhere else", () => {
    expect(appCallbackTarget({ code: "AbC-1_2.3~x", state: "S_1-2" })).toBe("nabdplus://login/app-callback?code=AbC-1_2.3~x&state=S_1-2");
    expect(appCallbackTarget({ code: "a+b/c==", state: "s" })).toBe("nabdplus://login/app-callback?code=a%2Bb%2Fc%3D%3D&state=s");
    expect(APP_CALLBACK_TARGET).toBe("nabdplus://login/app-callback");
  });

  it.each([
    [{}],
    [{ code: "c" }], // no state
    [{ state: "s" }], // neither a code nor an error
    [{ code: "c&redirect=https://evil.example", state: "s" }],
    [{ code: "c", state: "s\nLocation: x" }],
    [{ code: "c d", state: "s" }],
    [{ code: "a".repeat(2049), state: "s" }],
    [{ code: ["c1", "c2"], state: "s" }], // repeated parameter
    [{ code: "javascript:alert(1)", state: "s" }],
    [{ code: "<script>", state: "s" }],
    [{ error: "access_denied" }], // an error without a state
    [{ error: "access denied!", state: "s" }],
  ])("refuses %j (no target)", (query) => {
    expect(appCallbackTarget(query as never)).toBeNull();
  });

  it("passes the provider's error word through (with the state) so the app's browser can close", () => {
    expect(appCallbackTarget({ error: "access_denied", state: "s1" })).toBe("nabdplus://login/app-callback?error=access_denied&state=s1");
  });

  it("a code wins over an error, and the output never contains another scheme or host", () => {
    const out = appCallbackTarget({ code: "c", error: "access_denied", state: "s" }) as string;
    expect(out.startsWith("nabdplus://login/app-callback?code=c")).toBe(true);
    expect(out).not.toMatch(/https?:/);
  });
});

describe("Snapchat scopes on the web", () => {
  it("asks for the display name AND the external id (the backend's /me query needs externalId), space-separated", async () => {
    expect(CODE_PROVIDERS.snapchat.scope.split(" ")).toEqual([
      "https://auth.snapchat.com/oauth2/api/user.display_name",
      "https://auth.snapchat.com/oauth2/api/user.external_id",
    ]);
    const url = new URL(authorizeUrl("snapchat", "client", "https://nabd.plus/en/login/social-callback", await newPkce()));
    expect(url.searchParams.get("scope")).toContain("user.external_id");
  });
});
