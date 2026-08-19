import { describe, expect, it } from "vitest";

function findAccessToken(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  const record = value as Record<string, unknown>;
  if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;
  return Object.values(record).map(findAccessToken).find(Boolean);
}

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox credentials", () => {
  it("authenticates the owner account without exposing any credential or token", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
    const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;
    expect(baseUrl).toBeTruthy();
    expect(identifier).toBeTruthy();
    expect(password).toBeTruthy();

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });
    expect(response.ok).toBe(true);
    const payload: unknown = await response.json();
    expect(findAccessToken(payload)).toBeTruthy();
  }, 15_000);
});
