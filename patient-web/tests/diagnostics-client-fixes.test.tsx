import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { TrackingSteps } from "@/components-next/diagnostics-sample-tracking-client";

const code = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/ /g, " ");

describe("sample tracking steps", () => {
  it("draws only the steps the server sent", () => {
    const out = html(<TrackingSteps steps={[{ title: "Collector assigned", done: true }, { title: "On the way", done: false }]} />);
    expect(out).toContain("Collector assigned");
    expect(out).toContain("On the way");
    expect(out).not.toContain("Order received");
    expect(out).not.toContain("Result ready");
  });

  it("says there is no tracking yet, with no invented steps, when the server sent none", () => {
    const out = html(<TrackingSteps steps={[]} />);
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
