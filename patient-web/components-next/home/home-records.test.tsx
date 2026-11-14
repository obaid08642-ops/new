import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { getTranslations } from "next-intl/server";
import { RecordsCard, ReminderCard } from "./home-parts";

const t = ((key: string, values?: Record<string, string>) => (values ? `${key}(${Object.values(values).join(",")})` : key)) as unknown as Awaited<ReturnType<typeof getTranslations>>;

describe("the reminder card", () => {
  it("names the next dose and opens the reminders", () => {
    const html = renderToStaticMarkup(<ReminderCard locale="en" t={t} card={{ kind: "next", name: "Metformin", detail: "1 tab · 08:00" }} />);
    expect(html).toContain("Metformin");
    expect(html).toContain("1 tab · 08:00");
    expect(html).toContain('href="/en/health/medications?tab=all"');
  });
  it("says today's doses are done with the progress", () => {
    const html = renderToStaticMarkup(<ReminderCard locale="en" t={t} card={{ kind: "done", taken: 2, total: 3 }} />);
    expect(html).toContain("reminderAllDone");
    expect(html).toContain("reminderProgress(2,3)");
  });
});

describe("the records card", () => {
  it("draws only the rows it is given and links each to its screen", () => {
    const html = renderToStaticMarkup(<RecordsCard locale="en" t={t} rows={[{ key: "nutrition", meals: 2, waterMl: 0 }, { key: "mood", loggedToday: false }]} />);
    expect(html).toContain("recordsMeals(2)");
    expect(html).not.toContain("recordsWater");
    expect(html).toContain("recordsMoodNotLogged");
    expect(html).toContain('href="/en/nutrition/daily-tracker"');
    expect(html).toContain('href="/en/mental-health/mood"');
    expect(html).not.toContain("recordsVitals");
  });
  it("leaves out a row of a switched-off module and the whole card without rows", () => {
    expect(renderToStaticMarkup(<RecordsCard locale="en" t={t} rows={[{ key: "maternity", pregnant: true }]} disabled={new Set(["maternity"])} />)).toBe("");
    expect(renderToStaticMarkup(<RecordsCard locale="en" t={t} rows={[]} />)).toBe("");
  });
});
