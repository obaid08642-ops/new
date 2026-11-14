import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { TrackingSteps, parseTracking } from "@/components-next/diagnostics-sample-tracking-client";

const code = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/ /g, " ");

describe("sample tracking steps (decision B8: the booking's real timeline)", () => {
  it("names each state the booking went through, like the status chip", () => {
    const out = html(<TrackingSteps locale="en" steps={[{ state: "NEW_REQUEST", at: "2026-10-09T08:00:00Z" }, { state: "CONFIRMED" }, { state: "SAMPLE_COLLECTED" }]} />);
    expect(out).toContain("Waiting for confirmation");
    expect(out).toContain("Confirmed");
    expect(out).toContain("Sample collected");
    expect(out).not.toContain("State changed");
    expect(out).not.toContain("Report ready");
  });

  it("reads the timeline and only the preparation written in the page language", () => {
    const tr = parseTracking({ booking: { state: "CONFIRMED" }, tracking: {
      timeline: [{ state: "NEW_REQUEST", at: "2026-10-09T08:00:00Z" }, { nope: 1 }],
      preparation: [{ service_id: "s1", name_en: "Fasting glucose", texts: { en: ["Fast for 8 hours"], ar: ["صيام"] } }, { service_id: "s2", name_en: "CBC", texts: { ar: ["لا شيء"] } }],
      techName: "Test collector", eta: 12,
    } }, "en");
    expect(tr.steps).toEqual([{ state: "NEW_REQUEST", at: "2026-10-09T08:00:00Z" }]);
    expect(tr.preparation).toEqual([{ key: "s1", name: "Fasting glucose", lines: ["Fast for 8 hours"] }]);
    expect(parseTracking({ tracking: { preparation: [{ service_id: "s1", texts: { tl: ["Mag-ayuno"] } }] } }, "fil").preparation[0].lines).toEqual(["Mag-ayuno"]);
  });

  it("knows a home collection, with or without a collector yet", () => {
    expect(parseTracking({ booking: { state: "CONFIRMED", location_type: "HOME_COLLECTION" }, tracking: {} }, "en").home).toBe(true);
    expect(parseTracking({ booking: { state: "CONFIRMED", location_type: "IN_LAB" }, tracking: {} }, "en").home).toBe(false);
  });

  it("says there is no tracking yet, with no invented steps, when the server sent none", () => {
    const out = html(<TrackingSteps locale="en" steps={[]} />);
    expect(out).toContain("No tracking updates yet");
    expect(out).not.toContain("Order received");
    expect(out).not.toContain("Collector on the way");
    expect(out).not.toContain("<ol");
  });
});

describe("service booking modal", () => {
  it("is gone: home nursing is booked on /home-care/services/[serviceId]/book (issues 560, 634, 649)", () => {
    expect(existsSync(resolve(process.cwd(), "components-next/service-booking-modal.tsx"))).toBe(false);
  });
});

describe("booking detail route", () => {
  it("lives under /bookings, where labs/[labId] and radiology/[serviceId] cannot shadow it", () => {
    expect(existsSync(resolve(process.cwd(), "app/[locale]/diagnostics/bookings/[domain]/[bookingId]/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/[locale]/diagnostics/[domain]"))).toBe(false);
  });

  it("the checkout goes to a page that exists, never /diagnostics/orders/<id>", () => {
    const source = code("components-next/diagnostics-checkout-form.tsx");
    expect(source).not.toContain("diagnostics/orders/");
    expect(source).toContain("diagnosticOrderNextHref(locale, order)");
  });
});
