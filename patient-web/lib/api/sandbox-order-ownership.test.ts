import { describe, expect, it } from "vitest";

const sandboxOrderId = "91047ef2-ad36-422a-a184-629693e7c729";

function findAccessToken(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  const record = value as Record<string, unknown>;
  if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;
  return Object.values(record).map(findAccessToken).find(Boolean);
}

async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {
  expect(identifier).toBeTruthy();
  expect(password).toBeTruthy();
  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
  expect(response.ok).toBe(true);
  const token = findAccessToken(await response.json());
  expect(token).toBeTruthy();
  return token as string;
}

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox order ownership", () => {
  it("allows only the owner to read the designated cancelled order", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();
    const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);
    const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);

    const ownerResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${ownerToken}` } });
    expect(ownerResponse.status).toBe(200);

    const otherResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${otherToken}` } });
    expect([403, 404]).toContain(otherResponse.status);
  }, 30_000);
});
