import { describe, expect, it } from "vitest";
import { isAddressFormValid } from "./address-form";
import { addressToForm, buildAddressPatch, EMPTY_ADDRESS_FORM } from "./address-form";
import { isAllowedPatientApiRequest } from "../api/patient-allowlist";

const saved = { id: "3f2b8c1e-5d4a-4b6f-9a2c-1e8d7f6a5b4c", label: "Home", line1: "12 King Fahd Rd", line2: null, city: "riyadh", district: "olaya", region: "riyadh_region", notes: "Gate 2", is_default: true };

describe("editing a saved address (issue 769)", () => {
  it("fills the form with what is saved and leaves a missing field empty", () => {
    expect(addressToForm(saved)).toEqual({ label: "Home", line1: "12 King Fahd Rd", line2: "", city: "riyadh", district: "olaya", region: "riyadh_region", notes: "Gate 2" });
    expect(addressToForm({ id: "x" })).toEqual(EMPTY_ADDRESS_FORM);
  });

  it("sends only the fields that changed, trimmed", () => {
    const form = { ...addressToForm(saved), label: "  Work ", notes: "" };
    expect(buildAddressPatch(saved, form)).toEqual({ label: "Work", notes: "" });
  });

  it("sends nothing when nothing changed, and nothing for a form without a label or a first line", () => {
    expect(buildAddressPatch(saved, addressToForm(saved))).toBeNull();
    expect(buildAddressPatch(saved, { ...addressToForm(saved), label: "  " })).toBeNull();
    expect(buildAddressPatch(saved, { ...addressToForm(saved), line1: "" })).toBeNull();
    expect(isAddressFormValid(addressToForm(saved))).toBe(true);
  });

  it("goes through the patient proxy with the narrow PATCH and DELETE entries only", () => {
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}`, "PATCH")).toBe(true);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}`, "DELETE")).toBe(true);
    expect(isAllowedPatientApiRequest("/users/me/addresses", "PATCH")).toBe(false);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}/extra`, "PATCH")).toBe(false);
  });
});
