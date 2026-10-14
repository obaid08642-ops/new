import { afterEach, describe, expect, it, vi } from "vitest";

// AC-1 on the patient web: the OAuth documents are the backend's, never built or guessed here,
// and the consent form relays the decision to the backend and follows its redirect only.
const backendDoc = {
  issuer: "https://nabd.plus",
  authorization_endpoint: "https://nabd.plus/oauth/authorize",
  token_endpoint: "https://mcp.nabd.plus/api/v1/oauth/token",
  code_challenge_methods_supported: ["S256"],
};

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (n === "nabd_access" ? { value: "patient-session" } : undefined) }) }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("agent OAuth on the patient web (AC-1)", () => {
  it("serves the authorization-server metadata exactly as the backend states it", async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: unknown) => new Response(JSON.stringify(backendDoc), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/.well-known/oauth-authorization-server/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(backendDoc);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/oauth\/metadata$/);
  });

  it("answers 503 (no invented document) when the backend is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("the consent form posts the decision with the patient session and follows the backend's redirect", async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: unknown) => new Response(JSON.stringify({ redirect_to: "https://client.example/cb?code=abc&state=s" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/oauth/authorize/route");
    const form = new URLSearchParams({ client_id: "c1", redirect_uri: "https://client.example/cb", code_challenge: "x".repeat(43), code_challenge_method: "S256", response_type: "code", scope: "agent:read", state: "s", decision: "approve", locale: "en", extra: "dropped" });
    const res = await POST(new Request("https://nabd.plus/api/oauth/authorize", { method: "POST", body: form, headers: { "content-type": "application/x-www-form-urlencoded" } }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://client.example/cb?code=abc&state=s");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/oauth\/authorize$/);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer patient-session");
    const sent = JSON.parse(String(init.body));
    expect(sent.decision).toBe("approve");
    expect(sent.extra).toBeUndefined();
    expect(sent.locale).toBeUndefined();
  });

  it("an invalid request goes back to the consent page, never to the client", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_request" }), { status: 400 })));
    const { POST } = await import("@/app/api/oauth/authorize/route");
    const form = new URLSearchParams({ client_id: "c1", redirect_uri: "https://attacker.example/cb", decision: "approve", locale: "ur" });
    const res = await POST(new Request("https://nabd.plus/api/oauth/authorize", { method: "POST", body: form }));
    expect(res.status).toBe(303);
    const loc = new URL(res.headers.get("location") || "");
    expect(loc.host).toBe("nabd.plus");
    expect(loc.pathname).toBe("/ur/oauth/authorize");
  });

  it("a long OAuth return path survives sign-in", async () => {
    const { safeNextPath } = await import("@/lib/auth/safe-next");
    const path = `/en/oauth/authorize?${new URLSearchParams({ client_id: "nabd-agent-" + "a".repeat(24), redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect", code_challenge: "b".repeat(43), code_challenge_method: "S256", response_type: "code", scope: "agent:read agent:order agent:book", state: "c".repeat(200), resource: "https://mcp.nabd.plus/api/v1/mcp" })}`;
    expect(path.length).toBeGreaterThan(512);
    expect(safeNextPath(path)).toBe(path);
  });
});
