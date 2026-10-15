import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { QuickLogForm, quickLogBody } from "@/components-next/health/quick-log-form";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";
import { parseNutritionSummary } from "@/lib/nutrition/view";

/** Issues 862, 864, 869: the website writes the logs the app writes. Every value is a TEST value. */
describe("the log forms", () => {
  it("send the app's own bodies, with minutes sent as seconds where the app does", () => {
    expect(quickLogBody("water", { amount_ml: "250" })).toEqual({ ok: true, body: { amount_ml: 250 } });
    expect(quickLogBody("mood", { mood: "good", energy_level: "7", notes: " calm day " })).toEqual({ ok: true, body: { mood: "good", energy_level: 7, notes: "calm day" } });
    expect(quickLogBody("kicks", { count: "10", duration_seconds: "2" })).toEqual({ ok: true, body: { count: 10, duration_seconds: 120 } });
    expect(quickLogBody("contractions", { interval_seconds: "5", duration_seconds: "45" })).toEqual({ ok: true, body: { interval_seconds: 300, duration_seconds: 45 } });
    expect(quickLogBody("growth", { month: "3", weight_kg: "٥٫٨".replace("٫", ".") })).toEqual({ ok: true, body: { month: 3, weight_kg: 5.8 } });
  });

  it("refuse what the server would store wrong, naming the field", () => {
    expect(quickLogBody("water", {})).toEqual({ ok: false, field: "amount_ml" });
    expect(quickLogBody("water", { amount_ml: "99999" })).toEqual({ ok: false, field: "amount_ml" });
    expect(quickLogBody("mood", { mood: "ecstatic" })).toEqual({ ok: false, field: "mood" });
    expect(quickLogBody("kicks", { count: "2.5", duration_seconds: "1" })).toEqual({ ok: false, field: "count" });
    expect(quickLogBody("growth", { month: "3", head_circ_cm: "5" })).toEqual({ ok: false, field: "head_circ_cm" });
  });

  it("draw labelled controls in every kind, and the proxy allows exactly these writes", () => {
    for (const kind of ["water", "mood", "kicks", "contractions", "growth"] as const) {
      const html = renderToStaticMarkup(<QuickLogForm kind={kind} />);
      expect(html).toContain("<form");
      expect(html).not.toContain("style=");
    }
    expect(renderToStaticMarkup(<QuickLogForm kind="mood" />)).toContain('aria-pressed="false"');
    for (const path of ["/nutrition/water", "/mental-health/mood", "/maternity/kicks", "/maternity/contractions", "/maternity/infant-growth"]) expect(isAllowedPatientApiRequest(path, "POST")).toBe(true);
    expect(isAllowedPatientApiRequest("/maternity/anything", "POST")).toBe(false);
  });
});

describe("the day summary the nutrition page draws", () => {
  it("reads the server's calories and water objects (it showed 0 and no target before)", () => {
    expect(parseNutritionSummary({ calories: { consumed: 1200, burned: 0, target: 2000, net: 1200 }, water: { consumed_ml: 350, target_ml: 2500 } })).toEqual({ calories: 1200, target: 2000, waterMl: 350 });
    expect(parseNutritionSummary({ calories: 900, water_ml: 200 })).toEqual({ calories: 900, target: null, waterMl: 200 });
    expect(parseNutritionSummary(null)).toEqual({ calories: 0, target: null, waterMl: 0 });
  });
});
