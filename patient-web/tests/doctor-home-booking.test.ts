import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

// A home visit needs an address: the inline form (no address step) is not used for it; the full booking page is.
describe("doctor page: home visit booking", () => {
  it("sends a home visit to the full booking page instead of the inline form", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/consultations/doctors/[doctorId]/page.tsx"), "utf8");
    expect(source).toContain('serviceType === "home" ? (');
    expect(source).toContain("/consultations/book/${encodeURIComponent(doctor.id)}?service_type=home");
    expect(source).toContain('label={t("homeBookWithAddress")}');
  });

  it.each(LOCALES)("%s has the link label", (loc) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), "utf8"));
    expect(String(messages.Doctors.homeBookWithAddress ?? "").trim()).not.toBe("");
  });
});
