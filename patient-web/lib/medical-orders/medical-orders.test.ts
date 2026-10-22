import { describe, expect, it } from "vitest";
import { groupFlowHref, orderOf, ordersOf } from "./medical-orders";

const order = {
  id: "o1", status: "active", valid_days: 30, valid_until: "2026-11-30T00:00:00.000Z", expired: false, expires_soon: true, notes: " fast 8h ", appointment_id: "a1", prescription_id: "rx1",
  items: [
    { id: "i1", group: "labs", catalog_id: "c1", status: "open" },
    { id: "i2", group: "radiology", catalog_id: "c2", status: "later" },
    { id: "i3", group: "nursing", catalog_id: "c3", status: "open", sessions: 6, interval_days: 2 },
    { id: "bad", group: "pharmacy", catalog_id: "c4", status: "open" },
  ],
  groups: { labs: { items: [{ id: "i1", group: "labs", catalog_id: "c1", status: "open" }] }, prescription: { prescription_id: "rx1" } },
};

describe("M6 medical orders (Ord20/Ord21)", () => {
  it("reads the order, drops items it cannot place, keeps the flags and trims the note", () => {
    const o = orderOf(order);
    expect(o?.items.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
    expect(o?.expires_soon).toBe(true);
    expect(o?.expired).toBe(false);
    expect(o?.notes).toBe("fast 8h");
    expect(o?.groups.prescription?.prescription_id).toBe("rx1");
    expect(o?.items[2].sessions).toBe(6);
  });

  it("returns null for a row without an id or a validity date, and lists only the valid rows", () => {
    expect(orderOf({ items: [] })).toBeNull();
    expect(ordersOf({ data: [order, { id: "x" }] })).toHaveLength(1);
  });

  it("sends each group to the flow that already exists for it", () => {
    const o = orderOf(order)!;
    expect(groupFlowHref("en", "labs", o)).toBe("/en/diagnostics?kind=labs");
    expect(groupFlowHref("ar", "radiology", o)).toBe("/ar/diagnostics?kind=radiology");
    expect(groupFlowHref("en", "nursing", o)).toBe("/en/nursing");
    expect(groupFlowHref("en", "prescription", o)).toBe("/en/pharmacy/rx-order?prescriptionId=rx1");
  });
});
