import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractDoctor, priceForVisit } from "../lib/api/doctors";

describe("booking: the fee follows the visit type", () => {
  const doctor = extractDoctor({ id: "d1", name_en: "Dr S", price_clinic: 150, price_online: 200, price_home: null, offers_clinic: true, offers_online: true, offers_home: false });

  it("reads each visit type's own price", () => {
    expect(doctor).not.toBeNull();
    expect(priceForVisit(doctor!, "clinic")).toBe(150);
    expect(priceForVisit(doctor!, "video")).toBe(200);
  });

  it("gives no fee for a visit type with no price (it is not the clinic's)", () => {
    expect(priceForVisit(doctor!, "home")).toBeUndefined();
  });

  it("the booking flow prices the chosen visit type", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/booking-flow.tsx"), "utf8");
    expect(source).toContain("priceForVisit(doctor, visitType)");
    expect(source).not.toMatch(/doctor\?\.price != null/);
  });
});
