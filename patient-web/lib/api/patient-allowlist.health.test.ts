import { describe, expect, it } from "vitest";
import { isAllowedPatientApiTarget } from "./patient-allowlist";

// Web parity with the app: add a night of sleep, add or remove an emergency contact, save or unsave an article.
describe("patient proxy allowlist: health writes and article bookmarks", () => {
  it("allows the sleep and emergency-contact writes the forms make", () => {
    expect(isAllowedPatientApiTarget("/health/sleep", "", "POST")).toBe(true);
    expect(isAllowedPatientApiTarget("/health/emergency-contacts", "", "POST")).toBe(true);
    expect(isAllowedPatientApiTarget("/health/emergency-contacts/65f0c1a2b3c4d5e6f7a8b9c0", "", "DELETE")).toBe(true);
  });
  it("allows the bookmark status read and the toggle for one slug", () => {
    expect(isAllowedPatientApiTarget("/articles/bookmarks/healthy-sleep/status", "", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/articles/bookmarks/healthy-sleep/toggle", "", "POST")).toBe(true);
  });
  it("refuses other methods and paths", () => {
    expect(isAllowedPatientApiTarget("/health/sleep", "", "DELETE")).toBe(false);
    expect(isAllowedPatientApiTarget("/health/emergency-contacts", "", "DELETE")).toBe(false);
    expect(isAllowedPatientApiTarget("/health/emergency-contacts/a/b", "", "DELETE")).toBe(false);
    expect(isAllowedPatientApiTarget("/health/emergency-contacts/abc", "", "PATCH")).toBe(false);
    expect(isAllowedPatientApiTarget("/articles/bookmarks/x/toggle", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/articles/bookmarks/x/status", "", "POST")).toBe(false);
    expect(isAllowedPatientApiTarget("/articles/bookmarks/../toggle", "", "POST")).toBe(false);
  });
});
