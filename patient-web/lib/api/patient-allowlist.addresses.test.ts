import { describe, expect, it } from "vitest";
import { isAllowedPatientApiRequest } from "./patient-allowlist";

// Q10: the website address book posted to /api/bff/... (never existed → 404 on every save/delete).
describe("patient proxy allowlist — address book", () => {
  const id = "3f2b8c1e-5d4a-4b6f-9a2c-1e8d7f6a5b4c";
  it("allows listing, adding and deleting the caller's own addresses", () => {
    expect(isAllowedPatientApiRequest("/users/me/addresses", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/users/me/addresses", "POST")).toBe(true);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${id}`, "DELETE")).toBe(true);
  });
  it("does not open other methods or paths", () => {
    expect(isAllowedPatientApiRequest("/users/me/addresses", "DELETE")).toBe(false);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${id}`, "PUT")).toBe(false);
    expect(isAllowedPatientApiRequest("/users/me/addresses/../../admin", "DELETE")).toBe(false);
    expect(isAllowedPatientApiRequest(`/users/other/addresses/${id}`, "DELETE")).toBe(false);
  });
});
