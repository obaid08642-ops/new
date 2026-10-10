import { describe, expect, it } from "vitest";
import { canShowPromo, discountPercent, promoOldPrice, promoPercent } from "./discount";

describe("canShowPromo (owner decision 10: no offer, discount or crossed price on a prescription item)", () => {
  it("allows a promo on an item that needs no prescription", () => {
    expect(canShowPromo({})).toBe(true);
    expect(canShowPromo({ rx: false, is_rx: false, requires_prescription: false, requiresPrescription: false })).toBe(true);
    expect(canShowPromo({ rx: null, is_rx: null })).toBe(true);
  });

  it("refuses it whichever spelling of the prescription flag the row carries", () => {
    for (const flag of [{ rx: true }, { is_rx: true }, { requires_prescription: true }, { requiresPrescription: true }]) {
      expect(canShowPromo(flag)).toBe(false);
    }
  });
});

describe("promoPercent and promoOldPrice", () => {
  it("draw the real discount of an item that may show one", () => {
    expect(promoPercent({ rx: false }, 75, 100)).toBe(discountPercent(75, 100));
    expect(promoPercent({ rx: false }, 75, 100)).toBe(25);
    expect(promoOldPrice({ rx: false }, 75, 100)).toBe(100);
  });

  it("draw nothing for a prescription item, even when the answer still carries an old price", () => {
    expect(promoPercent({ is_rx: true }, 75, 100)).toBe(0);
    expect(promoOldPrice({ is_rx: true }, 75, 100)).toBeNull();
  });

  it("draw no crossed-out price without a real discount", () => {
    expect(promoOldPrice({}, 100, 100)).toBeNull();
    expect(promoOldPrice({}, 100, null)).toBeNull();
    expect(promoOldPrice({}, 0, 80)).toBeNull();
  });
});
