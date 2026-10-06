// Q102: the service booking modal "confirmed" lab, radiology and nursing
// bookings with setTimeout, a random reference and an invented address, and
// never called the API (and crashed on insurance: copay.toFixed of undefined).
// The modal is gone; each "Book" goes to the real flow.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { serviceBookHref } from "../components-next/service-book-link";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

describe("Q102: no fake service booking", () => {
  it("the fake modal no longer exists and nothing imports it", () => {
    expect(existsSync(join(__dirname, "../components-next/service-booking-modal.tsx"))).toBe(false);
    const offenders = [...files(join(__dirname, "../app")), ...files(join(__dirname, "../components-next"))]
      .filter((f) => /service-booking-modal|ServiceBookingModal/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("Book goes to the real flow for each service type", () => {
    expect(serviceBookHref("ar", "lab", "cbc-1", "CBC")).toBe("/ar/diagnostics/cart?add=cbc-1&name=CBC");
    expect(serviceBookHref("en", "radiology", "mri-1", "MRI brain")).toBe("/en/diagnostics/cart?add=rad_mri-1&name=MRI+brain");
    expect(serviceBookHref("ar", "nursing", "wound-1", "Wound care")).toBe("/ar/home-care/services/wound-1");
  });

  it("the diagnostics hub invents no prices, turnaround, names or popularity", () => {
    const src = readFileSync(join(__dirname, "../components-next/diagnostics-hub-client.tsx"), "utf8");
    expect(src).not.toMatch(/price\s*\|\|\s*\(?\s*\d/);
    expect(src).not.toMatch(/\|\|\s*24;/);
    expect(src).not.toMatch(/Most Popular|الأكثر طلباً/);
    expect(src).not.toMatch(/"باقة الفحص الشامل"|"Comprehensive Lab Package"/);
  });
});
