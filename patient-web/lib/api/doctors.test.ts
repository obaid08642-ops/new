import { describe, expect, it } from "vitest";
import { doctorDisplayName, doctorQuery, extractDoctors, parseDoctorId } from "./doctors";
describe("doctors parser", () => {
  it("keeps only documented display data", () => expect(extractDoctors({ data: [{ id: "doc-1", name_en: "Verified Doctor", specialty: "Cardiology", rating: 4.8, consultation_fee: 150, patient_id: "private", phone: "private" }] })).toMatchObject([{ id: "doc-1", name: "Verified Doctor", specialty: "Cardiology", rating: 4.8, price: 150 }]));
  it("builds bounded safe queries", () => { expect(doctorQuery({ specialty: "Cardiology", sort: "rating" })).toBe("/care/doctors?q=Cardiology&sort=rating"); expect(parseDoctorId("patient@example.com").success).toBe(false); });
  it("reads the fields GET /care/doctors really sends (toPublicDoctor): price_clinic/online/home, hospital, next_available_at, modes, degree", () => {
    const [d] = extractDoctors({ items: [{ id: "d1", name_ar: "د. س", name_en: "Dr S", specialty: "cardiology", academic_degree: "Consultant", price_clinic: null, price_online: 120, price_home: 200, hospital: "Nabd Clinic", next_available_at: "2026-10-06T09:00:00.000Z", consultation_modes: ["clinic", "video"], rating: 4.5, reviews_count: 12 }] });
    expect(d).toMatchObject({ id: "d1", nameAr: "د. س", nameEn: "Dr S", specialty: "cardiology", degree: "Consultant", price: 120, facility: "Nabd Clinic", nextSlot: "2026-10-06T09:00:00.000Z", clinic: true, online: true, home: false, reviews: 12 });
  });
  it("prefers the clinic price and ignores a zero price", () => {
    expect(extractDoctors([{ id: "a", name_ar: "x", price_clinic: 150, price_online: 100 }])[0].price).toBe(150);
    expect(extractDoctors([{ id: "a", name_ar: "x", price_clinic: 0, price_online: 0, price_home: 0 }])[0].price).toBeUndefined();
  });
  it("picks the doctor's name by the page language", () => {
    const row = extractDoctors([{ id: "a", name_ar: "د. س", name_en: "Dr S" }])[0];
    expect(doctorDisplayName(row, "ar")).toBe("د. س");
    expect(doctorDisplayName(row, "en")).toBe("Dr S");
    expect(doctorDisplayName(row, "ur")).toBe("Dr S");
    const arabicOnly = extractDoctors([{ id: "a", name_ar: "د. س", name_en: null }])[0];
    expect(doctorDisplayName(arabicOnly, "en")).toBe("د. س");
  });
});

describe("doctorPlace", () => {
  const doctor = { facility: "مستشفى دله", facilityAr: "مستشفى دله", facilityEn: "Dallah Hospital" };
  it("shows the facility in the page language: Arabic on ar and ur, English on the others", async () => {
    const { doctorPlace } = await import("./doctors");
    for (const locale of ["ar", "ur"]) expect(doctorPlace(doctor, locale)).toBe("مستشفى دله");
    for (const locale of ["en", "hi", "bn", "fil"]) expect(doctorPlace(doctor, locale)).toBe("Dallah Hospital");
  });
  it("falls back to the stored text when the facility names are not sent", async () => {
    const { doctorPlace, extractDoctors } = await import("./doctors");
    expect(doctorPlace({ facility: "عيادة حرة" }, "en")).toBe("عيادة حرة");
    expect(doctorPlace({}, "en")).toBeUndefined();
    const [row] = extractDoctors([{ id: "d1", name_en: "Dr A", hospital: "مستشفى دله", facility_name_ar: "مستشفى دله", facility_name_en: "Dallah Hospital" }]);
    expect(row.facilityEn).toBe("Dallah Hospital");
  });
});
