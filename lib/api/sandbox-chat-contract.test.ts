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

describeSandbox("Sandbox patient chat contract", () => {
  it("reads the current patient's thread list without reading messages or changing thread state", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();
    const accessToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);
    const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
    expect(response.status).toBe(200);
    const payload: unknown = await response.json();
    expect(payload === null || typeof payload === "object").toBe(true);
  }, 20_000);
});
