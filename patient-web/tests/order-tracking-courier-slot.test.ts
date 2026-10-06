import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractOrderTracking, maskCourierPhone } from "../lib/api/orders";

describe("live courier + delivery-slot tracking (P22)", () => {
  it("extracts courier identity, masked phone, and live position", () => {
    const tracking = extractOrderTracking({
      data: {
        state: "OUT_FOR_DELIVERY",
        courier: { name: "Khalid", phone: "+966501234567", lat: 24.7136, lng: 46.6753 },
      },
    });
    expect(tracking?.courier?.name).toBe("Khalid");
    expect(tracking?.courier?.phoneMasked).toBe("••• ••67");
    expect(tracking?.courier?.lat).toBeCloseTo(24.7136);
    expect(tracking?.courier?.lng).toBeCloseTo(46.6753);
  });

  it("masks courier phones and rejects impossible coordinates", () => {
    expect(maskCourierPhone("+966501234567")).toBe("••• ••67");
    expect(maskCourierPhone("")).toBeUndefined();
    expect(maskCourierPhone(null)).toBeUndefined();
    const tracking = extractOrderTracking({
      data: { state: "OUT_FOR_DELIVERY", courier: { name: "Khalid", lat: 999, lng: 999 } },
    });
    expect(tracking?.courier?.lat).toBeUndefined();
    expect(tracking?.courier?.lng).toBeUndefined();
  });

  it("extracts the delivery slot window and stays absent when upstream sends none", () => {
    const withSlot = extractOrderTracking({
      data: { state: "CONFIRMED", delivery_slot: { label: "Evening", start: "18:00", end: "20:00" } },
    });
    expect(withSlot?.slot).toEqual({ label: "Evening", start: "18:00", end: "20:00" });
    const without = extractOrderTracking({ data: { state: "CONFIRMED" } });
    expect(without?.courier).toBeUndefined();
    expect(without?.slot).toBeUndefined();
  });

  it("renders courier and slot surfaces on the tracking page", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/[locale]/orders/[orderId]/tracking/page.tsx"),
      "utf8",
    );
    expect(page).toContain('t("courierTitle")');
    expect(page).toContain('t("courierUnknown")');
    expect(page).toContain('t("slotTitle")');
    expect(page).toContain('t("slotUnknown")');
    expect(page).toContain("tracking.courier");
    expect(page).toContain("tracking.slot");
  });
});
