import { describe, expect, it } from "vitest";

function findAccessToken(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  const record = value as Record<string, unknown>;
  if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;
  return Object.values(record).map(findAccessToken).find(Boolean);
}

function firstResourceId(value: unknown): string | undefined {
  const root = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const items = Array.isArray(value) ? value : Array.isArray(root?.data) ? root.data : Array.isArray(root?.items) ? root.items : Array.isArray(root?.results) ? root.results : [];
  const first = items[0];
  return first && typeof first === "object" && typeof (first as Record<string, unknown>).id === "string" ? (first as Record<string, unknown>).id as string : undefined;
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

describeSandbox("Sandbox home-care booking contract", () => {
  it("allows the owner to read their list and rejects another patient for any available detail", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();
    const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);
    const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);
    const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
    expect(list.status).toBe(200);
    const bookingId = firstResourceId(await list.json().catch(() => null));
    if (!bookingId) return;
    const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
    expect(ownerDetail.status).toBe(200);
    const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });
    expect([403, 404]).toContain(otherDetail.status);
  }, 40_000);
});
