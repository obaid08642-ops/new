import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A home visit needs an address: the inline form (no address step) is not used for it; the full booking page is.
// One booking path: the doctor page never books by itself; every visit type (home needs an address) goes to the full booking page.
describe("doctor page: booking", () => {
  it("sends every visit type to the full booking page, with the visit type", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/consultations/doctors/[doctorId]/page.tsx"), "utf8");
    expect(source).not.toContain("AppointmentBookingForm");
    expect(source).toContain("/consultations/book/${encodeURIComponent(doctor.id)}");
    // the only Book action is the sticky bar (no in-card button, no sign-in gate in the schedule)
    expect(source).toContain("<StickyBookBar");
    expect(source).not.toContain("`${bookHref}?service_type=${serviceType}`");
  });

});
