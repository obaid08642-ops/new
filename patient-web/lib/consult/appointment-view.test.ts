import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isPast, isUpcoming, KNOWN_STATUSES, statusKey } from "./appointment-view";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

describe("appointment tabs and status labels", () => {
  it.each(["rescheduled", "en_route", "arrived"])("%s is an upcoming visit, in the same tab as in the app", (status) => {
    expect(isUpcoming(status)).toBe(true);
    expect(isPast(status)).toBe(false);
  });

  it.each(["rescheduled", "en_route", "arrived"])("%s has a status label key (not 'status unavailable')", (status) => {
    expect(statusKey(status)).toBe(status);
    expect(KNOWN_STATUSES).toContain(status);
  });

  it.each(LOCALES)("%s has a label for each status the screens name", (locale) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8"));
    for (const status of KNOWN_STATUSES) {
      expect(String(messages.ConsultWeb.status[status] ?? "").trim(), `${locale} ${status}`).not.toBe("");
    }
  });
});
