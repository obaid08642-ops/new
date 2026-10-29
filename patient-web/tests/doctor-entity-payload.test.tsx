import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractDoctors, extractEntityReviews, spokenLanguages } from "@/lib/api/doctors";
import { BioSection, ClinicGallery, EducationSection } from "@/components-next/consult/doctor-sections";

// The shape GET /entity-graph/related/doctor/:slug sends since #2043 (publicDoctorProfile + rating_avg / rating_count + reviews).
const entity = {
  id: "d1", name_en: "Dr A", specialty: "cardiology", rating: 4.5, reviews_count: 12, rating_avg: 4.5, rating_count: 12,
  photo_url: "/api/v1/care/doctors/d1/media/m1", clinicPhotos: ["/api/v1/care/doctors/d1/media/c1", "https://cdn.example/x.jpg"],
  bio: "About text", languages: ["ar", "en"],
  education: [{ university: "KSU", graduation_year: 2010, fellowship_board: "SB" }],
  reviews: { data: [{ score: 5, comment: "Great", createdAt: "2026-10-01T00:00:00.000Z", reviewer: "Omar S.", sub_ratings: null }], total: 9, page: 1, total_pages: 2, avg: 4.5, count: 9 },
};

describe("entity payload mapper", () => {
  it("maps photo, gallery, bio, languages, education and rating", () => {
    const d = extractDoctors([entity])[0];
    expect(d.photo).toBe("/api/doctor-media/d1/m1");
    expect(d.clinicPhotos).toEqual(["/api/doctor-media/d1/c1", "https://cdn.example/x.jpg"]);
    expect(d.bio).toBe("About text");
    expect(d.languages).toEqual(["ar", "en"]);
    expect(d.education).toEqual([{ degree: "SB", institution: "KSU", year: 2010, verified: false }]);
    expect(d.rating).toBe(4.5);
    expect(d.reviews).toBe(12);
  });
  it("falls back to rating_avg / rating_count when rating / reviews_count are null", () => {
    const d = extractDoctors([{ ...entity, rating: null, reviews_count: null }])[0];
    expect(d.rating).toBe(4.5);
    expect(d.reviews).toBe(12);
  });
  it("leaves absent fields undefined", () => {
    const d = extractDoctors([{ id: "d2", name_en: "Dr B", photo_url: null, clinicPhotos: [], bio: null, languages: [], education: [] }])[0];
    expect([d.photo, d.bio, d.languages, d.education, d.rating]).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(d.clinicPhotos).toEqual([]);
  });
  it("reads the first page of reviews", () => {
    const r = extractEntityReviews(entity);
    expect(r.total).toBe(9);
    expect(r.items).toEqual([{ score: 5, comment: "Great", date: "2026-10-01T00:00:00.000Z", reviewer: "Omar S." }]);
    expect(extractEntityReviews({ id: "d2" }).items).toEqual([]);
  });
  it("names spoken languages in the page language", () => {
    expect(spokenLanguages("en", ["ar", "en"])).toBe("Arabic, English");
    expect(spokenLanguages("en", undefined)).toBe("");
  });
});

describe("sections with and without data", () => {
  it("gallery, about and education render with data", () => {
    expect(renderToStaticMarkup(<ClinicGallery id="g" title="Clinic" photos={["https://cdn.example/x.jpg"]} openLabel={(n) => `open ${n}`} altLabel={(n) => `alt ${n}`} />)).toContain("alt 1");
    expect(renderToStaticMarkup(<BioSection id="b" title="About" bio="Hello" />)).toContain("Hello");
    expect(renderToStaticMarkup(<EducationSection id="e" title="Edu" rows={["SB · KSU · 2010"]} />)).toContain("SB · KSU · 2010");
  });
  it("are left out without data (education shows the empty text only when one is passed)", () => {
    expect(renderToStaticMarkup(<ClinicGallery id="g" title="Clinic" photos={[]} openLabel={String} altLabel={String} />)).toBe("");
    expect(renderToStaticMarkup(<ClinicGallery id="g" title="Clinic" photos={undefined} openLabel={String} altLabel={String} />)).toBe("");
    expect(renderToStaticMarkup(<BioSection id="b" title="About" bio={undefined} />)).toBe("");
    expect(renderToStaticMarkup(<EducationSection id="e" title="Edu" rows={[]} />)).toBe("");
    expect(renderToStaticMarkup(<EducationSection id="e" title="Edu" rows={[]} emptyText="none yet" />)).toContain("none yet");
  });
});
