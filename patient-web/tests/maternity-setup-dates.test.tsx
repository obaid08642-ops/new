import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
// the real en messages through the real ICU translator, so a missing key fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }) };
});

import { MaternitySetupClient } from "@/components-next/maternity-setup-client";
import { isAfterToday } from "@/lib/maternity-dates";
import { messagesFor } from "./helpers/intl";

/** Reconciliation row 90 (web side): the last period cannot be after today; the date input already gives a real day. */
describe("maternity setup dates", () => {
  it("compares the typed day with today by calendar day", () => {
    const now = new Date(2026, 8, 20, 10, 0, 0);
    expect(isAfterToday("2026-09-20", now)).toBe(false);
    expect(isAfterToday("2026-09-19", now)).toBe(false);
    expect(isAfterToday("2026-09-21", now)).toBe(true);
    expect(isAfterToday(" 2026-09-21 ", now)).toBe(true);
  });

  it("the form still renders its date field and has the future-date message in every language", () => {
    expect(renderToStaticMarkup(<MaternitySetupClient locale="en" />)).toContain('type="date"');
    for (const lang of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const text = (messagesFor(lang) as { MaternityWeb: { lmpFuture?: string } }).MaternityWeb.lmpFuture;
      expect(text && text.length > 10).toBe(true);
    }
  });
});
