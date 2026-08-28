import { describe, expect, it } from "vitest";
import { extractRecord, profileDomainState, readProfileFields } from "./profile";

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
    const responses = await Promise.all(
      ["/users/me/profile", "/medical-profile", "/users/me/insurance"].map((path) =>
        fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })
      )
    );
    for (const response of responses) {
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

  it("enforces the web display allowlist for every successful live profile response", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
    const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;
    expect(baseUrl && identifier && password).toBeTruthy();

    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
    expect(loginResponse.ok).toBe(true);
    const token = findAccessToken(await loginResponse.json());
    expect(token).toBeTruthy();

    const domains = [
      ["/users/me/profile", ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]],
      ["/medical-profile", ["bloodType", "height", "weight", "gender", "is_smoker", "drinks_alcohol", "is_pregnant", "is_breastfeeding"]],
      ["/users/me/insurance", ["providerName", "companyName", "status"]]
    ] as const;

    for (const [path, allowedKeys] of domains) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
      expect(response.ok).toBe(true);
      const record = extractRecord(await response.json().catch(() => null));
      const fields = readProfileFields(record, [...allowedKeys]);
      expect(fields.every((field) => allowedKeys.includes(field.key as never))).toBe(true);
    }
  }, 25_000);

  it("proves that allowed medical fields can be displayed while successful empty domains remain empty", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
    const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;
    expect(baseUrl && identifier && password).toBeTruthy();

    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
    expect(loginResponse.ok).toBe(true);
    const token = findAccessToken(await loginResponse.json());
    expect(token).toBeTruthy();

    const medicalResponse = await fetch(`${baseUrl}/medical-profile`, { headers: { authorization: `Bearer ${token}` } });
    expect(medicalResponse.ok).toBe(true);
    const medicalFields = readProfileFields(extractRecord(await medicalResponse.json().catch(() => null)), ["bloodType", "height", "weight", "gender", "is_smoker", "drinks_alcohol", "is_pregnant", "is_breastfeeding"]);
    expect(medicalFields.length, "Sandbox medical profile must expose at least one allowlisted display field").toBeGreaterThan(0);
    expect(profileDomainState(medicalResponse.status, medicalFields.length)).toBe("available");

    for (const [path, acceptedKeys] of [["/users/me/profile", ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]], ["/users/me/insurance", ["providerName", "companyName", "status"]]] as const) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
      expect(response.ok).toBe(true);
      const fields = readProfileFields(extractRecord(await response.json().catch(() => null)), [...acceptedKeys]);
      expect(["available", "empty"]).toContain(profileDomainState(response.status, fields.length));
    }
  }, 30_000);
});
