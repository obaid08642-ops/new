import { describe, expect, it } from "vitest";
import { isNonPatientRole, roleOf, WRONG_APP_MESSAGE, wrongAppResponse } from "@/lib/auth/wrong-app";
import { httpsUrl, providerLinks } from "@/lib/auth/provider-links";

describe("wrong app (a provider account on the patient site)", () => {
  it("blocks every role that is not a patient", () => {
    for (const role of ["doctor", "pharmacy", "lab", "admin", "super_admin", "nursing"]) expect(isNonPatientRole({ user: { role } })).toBe(true);
  });
  it("lets patients and guests through, and an answer without a role", () => {
    expect(isNonPatientRole({ user: { role: "patient" } })).toBe(false);
    expect(isNonPatientRole({ user: { role: "guest" } })).toBe(false);
    expect(isNonPatientRole({ token: {} })).toBe(false);
    expect(isNonPatientRole(null)).toBe(false);
    expect(roleOf({ user: { role: 5 } })).toBeNull();
  });
  it("answers 403 wrong_app and sets no cookie", async () => {
    const response = wrongAppResponse();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: WRONG_APP_MESSAGE });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("provider links", () => {
  it("shows only configured https links, nothing is built in", () => {
    expect(providerLinks({})).toEqual({ web: null, ios: null, android: null });
    expect(providerLinks({ web: "https://provider.example/", ios: "javascript:alert(1)", android: "not a url" })).toEqual({ web: "https://provider.example/", ios: null, android: null });
    expect(httpsUrl("http://insecure.example")).toBeNull();
  });
});
