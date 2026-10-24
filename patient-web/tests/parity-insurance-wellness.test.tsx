import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { NetworkList, filterProviders } from "@/components-next/insurance/network-list";
import { policyOptionals } from "@/components-next/insurance/add-policy-form";
import { quickLogBody } from "@/components-next/health/quick-log-form";
import { cycleDayOf } from "@/lib/maternity/view";
import { parseMeals, parseNutritionSummary } from "@/lib/nutrition/view";
import { parseBenefitsUsage, parseProviders, requestKindOf } from "@/lib/insurance/view";
import { parseInsuranceSummary } from "@/lib/api/insurance";

const providers = parseProviders([
  { id: "a", name_en: "Nur Clinic", type: "clinic", city: "Riyadh", specialties: ["x", "y", "z", "w"], phone: "+966500000000" },
  { id: "b", name_en: "Dar Hospital", type: "hospital", city: "Jeddah" },
  { id: "c", name_en: "Lab One", type: "lab", city: "Riyadh" },
]);

describe("insurance network list", () => {
  it("keeps at most three specialties, the city and the phone", () => {
    expect(providers[0]).toMatchObject({ specialties: ["x", "y", "z"], city: "Riyadh", phone: "+966500000000" });
  });
  it("filters by type chip and by name or city without a request", () => {
    expect(filterProviders(providers, "all", "").map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(filterProviders(providers, "hospital", "").map((p) => p.id)).toEqual(["b"]);
    expect(filterProviders(providers, "all", "riyadh").map((p) => p.id)).toEqual(["a", "c"]);
    expect(filterProviders(providers, "lab", "nur")).toEqual([]);
  });
  it("draws the chips, the search field and a call link only for a provider with a phone", () => {
    const html = renderToStaticMarkup(<NetworkList providers={providers} locale="en" />);
    expect(html).toContain('type="search"');
    expect(html.match(/aria-pressed/g)?.length).toBe(5);
    expect(html.match(/href="tel:/g)?.length).toBe(1);
  });
});

describe("add policy and summary", () => {
  it("sends only the optional fields that were filled", () => {
    expect(policyOptionals({ memberId: " ", memberName: "", expiry: "" })).toEqual({});
    expect(policyOptionals({ memberId: "7", memberName: " Test ", expiry: "2027-01-01" })).toEqual({ member_id: "7", member_name: "Test", expiry_date: "2027-01-01" });
  });
  it("reads the policy details and the verified flag as saved", () => {
    const summary = parseInsuranceSummary({ has_policy: true, policy: { company_name: "C", policy_number: "P1", member_name: "M", national_id: "N", network: "Net", verified: true } });
    expect(summary).toMatchObject({ hasPolicy: true, policyNumber: "P1", memberName: "M", nationalId: "N", network: "Net", verified: true });
    expect(parseInsuranceSummary({ has_policy: true, policy: { company_name: "C" } })?.verified).toBe(false);
  });
  it("benefits usage and request kinds", () => {
    expect(parseBenefitsUsage({ has_policy: false })).toBeNull();
    expect(parseBenefitsUsage({ has_policy: true, usage: { requests: 2, insurer_covered: 10, patient_share: 5 }, expiry_date: "2027-01-01" })).toEqual({ usage: { requests: 2, insurerCovered: 10, patientShare: 5 }, expiryDate: "2027-01-01" });
    expect(requestKindOf("lab")).toBe("lab");
    expect(requestKindOf("weird")).toBe("other");
  });
});

describe("mood tags and scales", () => {
  it("sends the energy and stress tiles as numbers and the tags as a list", () => {
    expect(quickLogBody("mood", { mood: "good", energy_level: "3", stress_level: "5", tags: "calm,rested" })).toEqual({ ok: true, body: { mood: "good", energy_level: 3, stress_level: 5, tags: ["calm", "rested"] } });
    expect(quickLogBody("mood", { mood: "good", tags: "" })).toEqual({ ok: true, body: { mood: "good" } });
  });
  it("refuses a tag that is not on the list", () => {
    expect(quickLogBody("mood", { mood: "good", tags: "calm,angry" })).toEqual({ ok: false, field: "tags" });
  });
});

describe("cycle day and nutrition macros", () => {
  it("counts the cycle day like the app (days since the last period plus one)", () => {
    const now = Date.UTC(2026, 9, 10, 12);
    expect(cycleDayOf("2026-10-01", now)).toBe(10);
    expect(cycleDayOf("garbage", now)).toBe(0);
  });
  it("reads the day's macros, the water target and the meal protein, and leaves out what the server did not send", () => {
    const summary = parseNutritionSummary({ calories: { consumed: 100, target: 2000 }, water: { consumed_ml: 250, target_ml: 2500 }, macros: { protein_g: 30, carbs_g: 80, fat_g: 10 } });
    expect(summary).toMatchObject({ proteinG: 30, carbsG: 80, fatG: 10, waterTargetMl: 2500 });
    expect(parseMeals([{ id: "m", name: "Rice", calories: 300, protein_g: 12 }, { id: "n", name: "Tea", calories: 5, protein_g: 0 }]).map((m) => m.proteinG)).toEqual([12, undefined]);
  });
});
