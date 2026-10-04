import { describe, expect, it, vi } from "vitest";

// Review of fbc1fec/35b44c2: when the API had no rating, the website showed an
// invented 4.8 (lab) or 4.9 (clinic), and every lab was "home visit: yes".
vi.mock("@/lib/api/upstream", () => ({ patientApiUrl: (path: string) => `https://api.test${path}`, callPatientApi: vi.fn() }));

import { extractLab } from "./labs-server";
import { extractClinic } from "./clinics-server";

describe("provider pages show only data the API returned", () => {
  it("a lab without rating or home-visit data gets neither", () => {
    const lab = extractLab({ data: { id: "lab-1", name_ar: "مختبر" } })!;
    expect(lab.rating).toBeUndefined();
    expect(lab.home_visit).toBe(false);
  });
  it("a lab that offers home visits keeps it", () => {
    expect(extractLab({ id: "lab-2", name_ar: "م", rating: 4.1, home_visit: true })).toMatchObject({ rating: 4.1, home_visit: true });
  });
  it("a clinic without a rating gets none", () => {
    expect(extractClinic({ data: { id: "c-1", name_ar: "عيادة" } })!.rating).toBeUndefined();
  });
});
