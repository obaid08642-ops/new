import { describe, expect, it } from "vitest";

function findAccessToken(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  const record = value as Record<string, unknown>;
  if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;
  return Object.values(record).map(findAccessToken).find(Boolean);
}

function countRecords(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  for (const key of ["items", "data", "results", "specialties", "doctors"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested.length;
    if (nested && typeof nested === "object") {
      const nestedCount = countRecords(nested);
      if (nestedCount > 0) return nestedCount;
    }
  }
  return 0;
}

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox specialty and provider discovery", () => {
  it("returns non-empty specialty and doctor discovery records without exposing their contents", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
    const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;
    expect(baseUrl && identifier && password).toBeTruthy();

    const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
    expect(login.ok).toBe(true);
    const accessToken = findAccessToken(await login.json());
    expect(accessToken).toBeTruthy();
    const headers = { authorization: `Bearer ${accessToken}` };

    const specialtiesResponse = await fetch(`${baseUrl}/care/specialties`, { headers, signal: AbortSignal.timeout(12_000) });
    const doctorsResponse = await fetch(`${baseUrl}/care/doctors`, { headers, signal: AbortSignal.timeout(12_000) });
    expect(specialtiesResponse.status).toBe(200);
    expect(doctorsResponse.status).toBe(200);

    const specialties = countRecords(await specialtiesResponse.json().catch(() => null));
    const doctors = countRecords(await doctorsResponse.json().catch(() => null));
    expect(specialties, "Sandbox specialty discovery must not be empty").toBeGreaterThan(0);
    expect(doctors, "Sandbox doctor discovery must not be empty").toBeGreaterThan(0);
  }, 35_000);
});
