import { describe, expect, it } from "vitest";
import { doctorQuery } from "@/lib/api/doctors";
import { cartSpecialty, consultHref, rxLineIds, specialtySlugOf } from "./rx-consult";

describe("specialtySlugOf (GET /medicines/:id/consult-specialty)", () => {
  it("reads the slug of the mapped specialty, bare or wrapped in data", () => {
    const body = { medicine_id: "m1", requires_prescription: true, specialty: { slug: "internal_medicine", name_ar: "باطنة", name_en: "Internal Medicine" }, source: "category" };
    expect(specialtySlugOf(body)).toBe("internal_medicine");
    expect(specialtySlugOf({ data: body })).toBe("internal_medicine");
  });

  it("is null when the admin mapped nothing or the body is not an answer", () => {
    expect(specialtySlugOf({ medicine_id: "m1", specialty: null, source: null })).toBeNull();
    expect(specialtySlugOf(null)).toBeNull();
    expect(specialtySlugOf("x")).toBeNull();
    expect(specialtySlugOf({ specialty: { slug: "../etc" } })).toBeNull();
  });
});

describe("cartSpecialty", () => {
  it("suggests the one specialty the lines agree on; unmapped lines do not vote", () => {
    expect(cartSpecialty(["pediatrics", "pediatrics"])).toBe("pediatrics");
    expect(cartSpecialty(["pediatrics", null])).toBe("pediatrics");
  });

  it("suggests nothing for a mixed or unmapped cart", () => {
    expect(cartSpecialty(["pediatrics", "cardiology"])).toBeNull();
    expect(cartSpecialty([null, null])).toBeNull();
    expect(cartSpecialty([])).toBeNull();
  });
});

describe("rxLineIds and consultHref", () => {
  it("asks only about prescription lines with a safe id, once each, at most five", () => {
    const lines = [{ id: "a", rx: true }, { id: "b", rx: false }, { id: "a", rx: true }, { id: "bad id", rx: true }, ...["c", "d", "e", "f", "g"].map((id) => ({ id, rx: true }))];
    expect(rxLineIds(lines)).toEqual(["a", "c", "d", "e", "f"]);
  });

  it("opens the doctors of the specialty by slug, or the specialty list when there is none", () => {
    expect(consultHref("ar", "cardiology")).toBe("/ar/consultations/doctors?specialty=cardiology");
    expect(consultHref("en", null)).toBe("/en/consultations/specialties");
  });

  it("the doctors list sends a known slug as the exact specialty filter and leaves other text as the search it always was", () => {
    expect(doctorQuery({ specialty: "cardiology" })).toBe("/care/doctors?specialty=cardiology");
    expect(doctorQuery({ specialty: "cardiology", sort: "rating" })).toBe("/care/doctors?specialty=cardiology&sort=rating");
    expect(doctorQuery({ specialty: "Cardiology" })).toBe("/care/doctors?q=Cardiology");
    expect(doctorQuery({ search: "ali", specialty: "cardiology" })).toBe("/care/doctors?q=ali");
  });
});
