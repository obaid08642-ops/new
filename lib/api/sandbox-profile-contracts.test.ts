import { describe, expect, it } from "vitest";

function findAccessToken(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  const record = value as Record<string, unknown>;
  if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;
  return Object.values(record).map(findAccessToken).find(Boolean);
}

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox profile contracts", () => {
  it("permits the owner to read profile domains without returning an authorization error", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
    const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;
    expect(baseUrl && identifier && password).toBeTruthy();
    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
    expect(loginResponse.ok).toBe(true);
    const token = findAccessToken(await loginResponse.json());
    expect(token).toBeTruthy();
    for (const path of ["/users/me/profile", "/medical-profile", "/users/me/insurance"]) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    }
  }, 20_000);

  it("rejects each self-scoped profile domain without a patient session", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();

    for (const path of ["/users/me/profile", "/medical-profile", "/users/me/insurance"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(401);
    }
  }, 20_000);
});
