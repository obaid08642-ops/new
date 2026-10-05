import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { AppointmentBookingForm, slotDisplay } from "../components-next/appointment-booking-form";
import { formatInProviderZone } from "../lib/datetime";

/**
 * F6 — `formatInProviderZone` was dead code (no production caller). It now
 * renders doctor slots: provider-attributed instants in Asia/Riyadh, never a
 * raw ISO string and never the device zone.
 */
describe("F6 — doctor slots render in the provider zone", () => {
  it("formats an unlabeled server instant in Asia/Riyadh", () => {
    // 06:00 UTC == 09:00 in Riyadh (no DST there, deterministic everywhere).
    expect(slotDisplay({ start: "2026-10-01T06:00:00.000Z", available: true }, "en")).toBe(
      formatInProviderZone("2026-10-01T06:00:00.000Z", "en"),
    );
    expect(slotDisplay({ start: "2026-10-01T06:00:00.000Z", available: true }, "en")).toContain("9:00");
  });

  it("keeps an explicit server label untouched", () => {
    expect(
      slotDisplay({ start: "2026-10-01T06:00:00.000Z", label: "09:00 صباحاً", available: true }, "ar"),
    ).toBe("09:00 صباحاً");
  });

  it("falls back to the raw value when the instant is unparseable", () => {
    expect(slotDisplay({ start: "not-a-date", available: true }, "en")).toBe("not-a-date");
  });

  it("the booking form never leaks a raw ISO slot", () => {
    const html = renderToStaticMarkup(
      <AppointmentBookingForm
        locale="en"
        doctorId="d1"
        serviceType="clinic"
        slots={[{ start: "2026-10-01T06:00:00.000Z", available: true }]}
      />,
    );
    expect(html).not.toContain("2026-10-01T06:00:00.000Z");
    expect(html).toContain("9:00");
  });
});
