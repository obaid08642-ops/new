import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { RxOrderThese, rxCartItems } from "@/components-next/pharmacy/rx-order-these";

const state = vi.hoisted(() => ({ addItem: vi.fn(), push: vi.fn(), onClick: null as null | (() => void), label: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ addItem: state.addItem }) }));
// the design-system button is covered by its own tests: here only the label and the click it was handed
vi.mock("@/components-next/ui-generated/components/Button", () => ({
  Button: ({ label, onClick }: { label: string; onClick: () => void }) => { state.onClick = onClick; state.label = label; return <button>{label}</button>; },
}));

const rxId = "91047ef2-ad36-422a-a184-629693e7c729";
const messages = { Prescriptions: { orderCta: "Order these medicines", notInCart: "{count} of {total} left out" } };
const view = (lines: Parameters<typeof RxOrderThese>[0]["lines"]) =>
  renderToStaticMarkup(<NextIntlClientProvider locale="en" messages={messages} timeZone="UTC"><RxOrderThese locale="en" prescriptionId={rxId} lines={lines} /></NextIntlClientProvider>);

afterEach(() => { state.addItem.mockReset(); state.push.mockReset(); state.onClick = null; state.label = ""; });

describe("order these medicines (decision 18, OD-18)", () => {
  it("puts the catalogue medicines in the cart with the prescribed quantity, prescription-only and carrying the prescription, then opens the cart", () => {
    view([{ medicineId: "m1", name: "Metformin", quantity: 3 }, { medicineId: "m2", name: "Vitamin D" }]);
    expect(state.label).toBe("Order these medicines");
    state.onClick?.();
    expect(state.addItem).toHaveBeenCalledTimes(2);
    expect(state.addItem).toHaveBeenNthCalledWith(1, { id: "m1", name: "Metformin", rx: true, prescriptionId: rxId, qty: 3 });
    expect(state.addItem).toHaveBeenNthCalledWith(2, { id: "m2", name: "Vitamin D", rx: true, prescriptionId: rxId, qty: 1 });
    expect(state.push).toHaveBeenCalledWith("/en/cart");
  });

  it("says how many hand-written lines were left out, and adds only the others", () => {
    const html = view([{ medicineId: "m1", name: "A" }, { name: "Handwritten" }]);
    expect(html).toContain("1 of 2 left out");
    state.onClick?.();
    expect(state.addItem).toHaveBeenCalledTimes(1);
  });

  it("offers no button when no line has a catalogue id", () => {
    const html = view([{ name: "Handwritten" }]);
    expect(html).not.toContain("<button");
    expect(html).toContain("1 of 1 left out");
  });

  it("keeps the quantity a whole number from 1 to 99", () => {
    expect(rxCartItems(rxId, [{ medicineId: "a", name: "A", quantity: 0 }, { medicineId: "b", name: "B", quantity: 500 }, { medicineId: "c", name: "C", quantity: 2.7 }]).map((i) => i.qty)).toEqual([1, 99, 2]);
  });
});
