import { describe, expect, it } from "vitest";
import { parseSocialConfig, resolveSocial, socialFromEnv } from "./social-config";

const on = { enabled: true };
const answer = {
  google: { ...on, client_id: "g-web" },
  apple: { ...on, client_id: "a-web", redirect_uri: "https://nabd.plus/ar/login" },
  x: { ...on, client_id: "x-id" },
  snapchat: { ...on, client_id: "s-id" },
};

describe("GET /auth/social/config → buttons", () => {
  it("draws each provider the backend enabled, with its public ids", () => {
    expect(parseSocialConfig(answer)).toEqual({
      google: { clientId: "g-web" },
      apple: { clientId: "a-web", redirectUri: "https://nabd.plus/ar/login" },
      x: { clientId: "x-id" },
      snapchat: { clientId: "s-id" },
    });
  });
  it.each(["google", "apple", "x", "snapchat"] as const)("%s off in the answer → no button", (provider) => {
    const parsed = parseSocialConfig({ ...answer, [provider]: { ...answer[provider], enabled: false } })!;
    expect(parsed[provider]).toBeUndefined();
    expect(Object.keys(parsed)).toHaveLength(3);
  });
  it("needs the ids a button works with: Apple without a redirect URI, or any provider without a client id, is not drawn", () => {
    expect(parseSocialConfig({ ...answer, apple: { ...on, client_id: "a" } })!.apple).toBeUndefined();
    expect(parseSocialConfig({ ...answer, google: { ...on } })!.google).toBeUndefined();
    expect(parseSocialConfig({ ...answer, x: { ...on, client_id: "  " } })!.x).toBeUndefined();
  });
  it("is null for something that is not the answer, and an all-off answer is an empty set (not the fallback)", () => {
    for (const bad of [null, undefined, "x", [], {}, { foo: 1 }]) expect(parseSocialConfig(bad)).toBeNull();
    expect(parseSocialConfig({ google: { enabled: false }, apple: { enabled: false }, x: { enabled: false }, snapchat: { enabled: false } })).toEqual({});
  });
});

describe("the build-time fallback", () => {
  const env = { NEXT_PUBLIC_GOOGLE_CLIENT_ID: "g", NEXT_PUBLIC_APPLE_CLIENT_ID: "a", NEXT_PUBLIC_APPLE_REDIRECT_URI: "https://x.test/cb", NEXT_PUBLIC_X_CLIENT_ID: "x", NEXT_PUBLIC_SNAPCHAT_CLIENT_ID: "s" };
  it("keeps X and Snapchat behind NEXT_PUBLIC_SOCIAL_X_SNAPCHAT=1", () => {
    expect(socialFromEnv(env)).toEqual({ google: { clientId: "g" }, apple: { clientId: "a", redirectUri: "https://x.test/cb" } });
    expect(socialFromEnv({ ...env, NEXT_PUBLIC_SOCIAL_X_SNAPCHAT: "1" }).x).toEqual({ clientId: "x" });
  });
  it("applies only when the backend gave no answer; an answer always wins", () => {
    expect(resolveSocial(null, env).google).toEqual({ clientId: "g" });
    expect(resolveSocial({ google: { enabled: false }, apple: { enabled: false }, x: { enabled: false }, snapchat: { enabled: false } }, env)).toEqual({});
    expect(resolveSocial(answer, {}).x).toEqual({ clientId: "x-id" });
  });
});
