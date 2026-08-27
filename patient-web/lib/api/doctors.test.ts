import { describe, expect, it } from "vitest";
import { doctorQuery, extractDoctors, parseDoctorId } from "./doctors";
describe("doctors parser", () => {
  it("keeps only documented display data", () => expect(extractDoctors({ data: [{ id: "doc-1", name_en: "Verified Doctor", specialty: "Cardiology", rating: 4.8, consultation_fee: 150, patient_id: "private", phone: "private" }] })).toMatchObject([{ id: "doc-1", name: "Verified Doctor", specialty: "Cardiology", rating: 4.8, price: 150 }]));
  it("builds bounded safe queries", () => { expect(doctorQuery({ specialty: "Cardiology", sort: "rating" })).toBe("/care/doctors?search=Cardiology&sort=rating"); expect(parseDoctorId("patient@example.com").success).toBe(false); });
});
