import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractDoctor, extractDoctors, extractPublicRatings, doctorQuery } from "@/lib/api/doctors";
import { cardFacts } from "./doctor-card-facts";
import { filterApiParams, filterPageParams, parseDoctorFilters } from "./doctor-filters";
import { reviewItems } from "./doctor-reviews";
import { ClinicMap, DoctorFacts, PriceRows, ReviewList } from "@/components-next/consult/doctor-sections";

const labels = { years: (n: string) => `${n} yrs`, male: "M", female: "F", insurance: "Ins", wait: (n: string) => `${n} min` };

describe("doctor parser: richer fields are read only when the server sent them", () => {
  it("reads gender, is_online, wait, education, services, follow-up, address, location, reviews_data", () => {
    const d = extractDoctor({ data: { id: "d1", name_en: "A", gender: "female", is_online: true, wait_time: 12, education: [{ degree: "MD", institution: "KSU", year: 2010, verified: true }], certificates: [{ name: "Board" }], services: [{ name_en: "Scan", price: 100 }], follow_up_price: 50, follow_up_days: 14, clinic_address: "Street 1", location: { lat: 24.7, lng: 46.7 }, reviews_data: [{ rating: 5, text: "good", date: "2026-01-02T00:00:00Z", reviewer: "Sara" }] } });
    expect(d).toMatchObject({ gender: "female", isOnline: true, waitMinutes: 12, followUp: { price: 50, days: 14 }, clinicAddress: "Street 1", location: { lat: 24.7, lng: 46.7 } });
    expect(d?.education?.[0]).toMatchObject({ degree: "MD", verified: true });
    expect(d?.certificates?.[0]).toMatchObject({ name: "Board", verified: false });
    expect(d?.services?.[0]).toMatchObject({ nameEn: "Scan", price: 100 });
    expect(d?.reviewsData?.[0]).toMatchObject({ rating: 5, reviewer: "Sara" });
  });
  it("reads what the backend sends today: avg_wait_minutes and education as university / graduation_year / fellowship_board (LR-9)", () => {
    const d = extractDoctor({ data: { id: "d9", name_en: "A", avg_wait_minutes: 18, education: [{ university: "KSU", graduation_year: 2010, fellowship_board: "SBIM" }, { university: null, graduation_year: null, fellowship_board: null }] } });
    expect(d?.waitMinutes).toBe(18);
    expect(d?.education).toEqual([{ degree: "SBIM", institution: "KSU", year: 2010, verified: false }]);
  });
  it("leaves every new field undefined when absent (no invented values)", () => {
    const d = extractDoctors([{ id: "d2" }])[0];
    for (const key of ["gender", "isOnline", "education", "certificates", "services", "followUp", "clinicAddress", "location", "reviewsData", "waitMinutes"] as const) expect(d[key]).toBeUndefined();
    expect(cardFacts(d, "en", labels)).toEqual([]);
  });
  it("drops an unknown gender and a bad location", () => {
    expect(extractDoctors([{ id: "d3", gender: "x" }])).toEqual([]);
    expect(extractDoctors([{ id: "d4", location: { lat: 999, lng: 0 } }])).toEqual([]);
  });
  it("reads the public ratings list", () => {
    expect(extractPublicRatings({ data: [{ score: 4, comment: "ok", createdAt: "2026-02-01", reviewer: "Omar" }, { score: 9 }], total: 1 })).toEqual({ items: [{ score: 4, comment: "ok", date: "2026-02-01", reviewer: "Omar" }], total: 1 });
  });
});

describe("gender filter", () => {
  it("is read from the URL, sent to the API and kept in the page query", () => {
    const f = parseDoctorFilters({ gender: "female" });
    expect(f.gender).toBe("female");
    expect(filterApiParams(f)).toContainEqual(["gender", "female"]);
    expect(filterPageParams(f).get("gender")).toBe("female");
    expect(doctorQuery({ filters: f })).toContain("gender=female");
  });
  it("ignores any other value (any)", () => {
    const f = parseDoctorFilters({ gender: "other" });
    expect(f.gender).toBeUndefined();
    expect(filterApiParams(f).some(([k]) => k === "gender")).toBe(false);
  });
});

describe("card facts and review rows", () => {
  it("lists only what is present", () => {
    expect(cardFacts({ experienceYears: 7, gender: "male", acceptsInsurance: true, waitMinutes: 10 }, "en", labels)).toEqual(["7 yrs", "M", "Ins", "10 min"]);
    expect(cardFacts({ experienceYears: undefined, gender: undefined, acceptsInsurance: false, waitMinutes: undefined }, "en", labels)).toEqual([]);
  });
  it("names only the sub-ratings it can translate, and falls back to the anonymous label", () => {
    const rows = reviewItems([{ rating: 4, text: "t", reviewer: undefined, subRatings: [{ key: "communication", value: 5 }, { key: "mystery", value: 1 }] }], "en", { anonymous: "Patient", subLabels: { communication: "Communication" } });
    expect(rows[0].who).toBe("Patient");
    expect(rows[0].subs).toEqual([{ label: "Communication", value: "5" }]);
  });
});

describe("sections render", () => {
  it("facts: empty draws nothing, filled draws a list", () => {
    expect(renderToStaticMarkup(createElement(DoctorFacts, { label: "L", items: [] }))).toBe("");
    expect(renderToStaticMarkup(createElement(DoctorFacts, { label: "L", items: ["a", "b"] }))).toContain("<li");
  });
  it("reviews and price rows render their text", () => {
    const html = renderToStaticMarkup(createElement(ReviewList, { items: [{ key: "1", score: 5, text: "Great", who: "Sara", date: "Jan 2", subs: [{ label: "Value", value: "5" }] }], scoreLabel: (s) => `${s}/5` }));
    expect(html).toContain("Great");
    expect(html).toContain("Sara");
    expect(html).toContain("Value");
    expect(renderToStaticMarkup(createElement(PriceRows, { rows: [{ label: "Scan", price: "100 SAR" }] }))).toContain("100 SAR");
  });
  it("map: nothing without address or point; address only without a point; iframe with a point", () => {
    const base = { id: "m", title: "Clinic", mapTitle: "Map", openLabel: "Open" };
    expect(renderToStaticMarkup(createElement(ClinicMap, base))).toBe("");
    const addr = renderToStaticMarkup(createElement(ClinicMap, { ...base, address: "Street 1" }));
    expect(addr).toContain("Street 1");
    expect(addr).not.toContain("iframe");
    expect(renderToStaticMarkup(createElement(ClinicMap, { ...base, point: { lat: 24.7, lng: 46.7 } }))).toContain("openstreetmap.org/export/embed.html");
  });
});
