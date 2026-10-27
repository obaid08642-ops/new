// Owner layout decisions 12-15 and additions a, b: no Map button on the doctors list, three visit-type cards, one Filters button with
// a sheet (no chip rows on the page), the active-filter chips with Clear all, a sticky search, and the cash wording.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const code = (file: string) => readFileSync(file, "utf8");
const view = code("app/[locale]/consultations/doctors/doctors-view.tsx");
const message = (locale: string) => JSON.parse(code(`messages/${locale}.json`)).Doctors as Record<string, string>;

describe("consultations doctors list layout", () => {
  it("draws no Map button", () => {
    expect(view).not.toContain("mapType");
    expect(view).not.toContain("svcMap");
  });
  it("has the three visit-type cards and no segmented chip rows for gender, grade, payment, sort", () => {
    expect(view).toContain("<VisitTypeCards");
    for (const old of ["genderLabel", "gradeLabel", "paymentLabel", "sortLabel", "DoctorQuickFilters"]) expect(view, old).not.toContain(old);
  });
  it("has one Filters button with a count, a sticky search, active chips and Clear all", () => {
    expect(view).toContain("<DoctorFiltersSheet");
    expect(view).toContain("styles.searchSticky");
    expect(view).toContain("activeChips.length > 0");
    expect(view).toContain('t("filtersClearAll")');
    const sheet = code("components-next/consult/doctor-filters-panel.tsx");
    for (const needle of ['role="dialog"', 'aria-modal="true"', 'event.key === "Escape"', 'event.key !== "Tab"', "aria-labelledby"]) expect(sheet, needle).toContain(needle);
  });
  it("keeps the existing self-pay key and draws the chosen payment next to the Filters button", () => {
    expect(message("en").payment_self_pay).toBe("Self-pay");
    expect(message("ar").payment_self_pay).toBe("دفع ذاتي");
    const trigger = code("components-next/consult/doctor-filters-sheet.tsx");
    expect(trigger).toContain("panel.filters.payment");
    expect(trigger).toContain("t(`payment_${panel.filters.payment}`)");
    for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(message(l).payment_self_pay.length, l).toBeGreaterThan(0);
      for (const key of ["filters", "filtersApply", "filtersClearAll", "visitSubClinic", "visitSubVideo", "visitSubHome", "removeFilter", "filterAll"]) expect(message(l)[key], `${l}.${key}`).toBeTruthy();
    }
  });
});
