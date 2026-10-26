import { describe, expect, it } from "vitest";
import { isAddressFormValid } from "./address-form";
import { addressToForm, buildAddressPatch, buildCreateBody, EMPTY_ADDRESS_FORM } from "./address-form";
import { isAllowedPatientApiRequest } from "../api/patient-allowlist";

const saved = { id: "3f2b8c1e-5d4a-4b6f-9a2c-1e8d7f6a5b4c", label: "Home", line1: "12 King Fahd Rd", line2: null, city: "riyadh", district: "olaya", region: "riyadh_region", notes: "Gate 2", is_default: true };

describe("editing a saved address (issue 769)", () => {
  it("fills the form with what is saved and leaves a missing field empty", () => {
    expect(addressToForm(saved)).toEqual({ label: "Home", line1: "12 King Fahd Rd", line2: "", city: "riyadh", district: "olaya", region: "riyadh_region", notes: "Gate 2", short_address: "", building: "", floor: "" });
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

  it("sends a short address that changed, and an empty one removes it (19.7)", () => {
    expect(buildAddressPatch(saved, { ...addressToForm(saved), short_address: " RRRD2929 " })).toEqual({ short_address: "RRRD2929" });
    const withCode = { ...saved, short_address: "RRRD2929" };
    expect(addressToForm(withCode).short_address).toBe("RRRD2929");
    expect(buildAddressPatch(withCode, { ...addressToForm(withCode), short_address: "" })).toEqual({ short_address: "" });
    expect(buildAddressPatch(withCode, addressToForm(withCode))).toBeNull();
  });

  it("looks a short address up through the patient proxy, GET only, with a plain code", () => {
    expect(isAllowedPatientApiRequest("/national-address/lookup?code=RRRD2929", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/national-address/lookup?code=RRRD%202929", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/national-address/lookup?code=RRRD2929", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/national-address/lookup?code=../../admin", "GET")).toBe(false);
    expect(isAllowedPatientApiRequest("/national-address/lookup", "GET")).toBe(false);
  });

  it("goes through the patient proxy with the narrow PATCH and DELETE entries only", () => {
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}`, "PATCH")).toBe(true);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}`, "DELETE")).toBe(true);
    expect(isAllowedPatientApiRequest("/users/me/addresses", "PATCH")).toBe(false);
    expect(isAllowedPatientApiRequest(`/users/me/addresses/${saved.id}/extra`, "PATCH")).toBe(false);
  });
});

import { pointBody, pointFromPosition } from "./address-form";

describe("the pin of an address", () => {
  it("accepts a real coordinate only", () => {
    expect(pointFromPosition(24.7, 46.6)).toEqual({ lat: 24.7, lng: 46.6 });
    expect(pointFromPosition(91, 0)).toBeNull();
    expect(pointFromPosition(0, 181)).toBeNull();
    expect(pointFromPosition(NaN, 1)).toBeNull();
    expect(pointFromPosition("24", 46)).toBeNull();
  });
  it("adds the two numbers to a request, or nothing", () => {
    expect(pointBody({ lat: 1, lng: 2 })).toEqual({ lat: 1, lng: 2 });
    expect(pointBody(null)).toEqual({});
  });
});

describe("building and floor (address map flow)", () => {
  it("are part of the form, the PATCH and the POST body", () => {
    expect(buildAddressPatch(saved, { ...addressToForm(saved), building: " 7421 ", floor: "3" })).toEqual({ building: "7421", floor: "3" });
    expect(buildCreateBody({ ...EMPTY_ADDRESS_FORM, label: "Home", line1: "x", building: "7" }, { lat: 1, lng: 2 })).toMatchObject({ building: "7", lat: 1, lng: 2 });
  });
});
