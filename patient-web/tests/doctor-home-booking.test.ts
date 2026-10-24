import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

// A home visit needs an address: the inline form (no address step) is not used for it; the full booking page is.
// One booking path: the doctor page never books by itself; every visit type (home needs an address) goes to the full booking page.
describe("doctor page: booking", () => {
  it("sends every visit type to the full booking page, with the visit type", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/consultations/doctors/[doctorId]/page.tsx"), "utf8");
    expect(source).not.toContain("AppointmentBookingForm");
    expect(source).toContain("/consultations/book/${encodeURIComponent(doctor.id)}?service_type=${serviceType}");
    expect(source).toContain('label={t("chooseDayTime")}');
  });

  it.each(LOCALES)("%s has the link label", (loc) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), "utf8"));
    expect(String(messages.Doctors.chooseDayTime ?? "").trim()).not.toBe("");
  });
});
