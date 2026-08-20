import { describe, expect, it } from "vitest";
import { isAllowedPatientApiPath, isAllowedPatientApiRequest } from "./patient-allowlist";

describe("patient API allowlist", () => {
  it("allows only the documented order reads needed by the browser BFF", () => {
    expect(isAllowedPatientApiPath("/orders/mine")).toBe(true);
    expect(isAllowedPatientApiPath("/orders/91047ef2-ad36-422a-a184-629693e7c729")).toBe(true);
    expect(isAllowedPatientApiPath("/medical-profile")).toBe(false);
  });

  it("rejects administrative, provider, unlisted patient domains, and writes", () => {
    expect(isAllowedPatientApiPath("/admin/users")).toBe(false);
    expect(isAllowedPatientApiPath("/provider/queue")).toBe(false);
    expect(isAllowedPatientApiRequest("/orders/mine", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/orders/mine", "POST")).toBe(false);
  });
});
