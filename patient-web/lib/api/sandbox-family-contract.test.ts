import { describe, expect, it } from "vitest";

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
  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
  expect(response.ok).toBe(true);
  const accessToken = findAccessToken(await response.json());
  expect(accessToken).toBeTruthy();
  return accessToken as string;
}

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox family contract", () => {
  it("reads only the current patient's family list and never performs mutations", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();
    const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);
    const list = await fetch(`${baseUrl}/family/members`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
    expect(list.status).toBe(200);
    const payload: unknown = await list.json();
    expect(payload === null || typeof payload === "object").toBe(true);
  }, 20_000);

  it("rejects the self-scoped family list without a patient session", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();

    const response = await fetch(`${baseUrl}/family/members`, { signal: AbortSignal.timeout(12_000) });
    expect(response.status).toBe(401);
  }, 15_000);
});
