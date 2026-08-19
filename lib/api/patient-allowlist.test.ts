import { describe, expect, it } from "vitest";
import { isAllowedPatientApiPath } from "./patient-allowlist";
describe("patient API allowlist", () => { it("allows documented patient domains", () => { expect(isAllowedPatientApiPath("/orders/mine")).toBe(true); expect(isAllowedPatientApiPath("/medical-profile")).toBe(true); }); it("does not expose administrative or provider paths through the patient proxy", () => { expect(isAllowedPatientApiPath("/admin/users")).toBe(false); expect(isAllowedPatientApiPath("/provider/queue")).toBe(false); }); });
