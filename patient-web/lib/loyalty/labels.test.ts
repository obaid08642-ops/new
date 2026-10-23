import { describe, expect, it } from "vitest";
import { earnLabels, perkLabel, tierLabel } from "./labels";

const t = Object.assign((key: string) => `T(${key})`, { has: (key: string) => !key.includes("diamond") });

describe("loyalty labels", () => {
  it("shows a known tier and perk through the translation, an unknown one as the server sent it", () => {
    expect(tierLabel(t, { id: "silver", label: "فضي" })).toBe("T(tier.silver)");
    expect(tierLabel(t, { id: "diamond", label: "ماسي" })).toBe("ماسي");
    expect(perkLabel(t, "8% كاشباك", "cashback_8")).toBe("T(perk.cashback_8)");
    expect(perkLabel(t, "ميزة جديدة", "brand_new")).toBe("ميزة جديدة");
    expect(perkLabel(t, "ميزة بلا رمز", undefined)).toBe("ميزة بلا رمز");
  });

  it("names a way to earn by its reason, and the health challenge by its varying points", () => {
    expect(earnLabels(t, { action: "استشارة", points: "+50", reason: "booking_completed" })).toEqual({ title: "T(earn.booking_completed)", points: "+50", varies: false });
    expect(earnLabels(t, { action: "تحدي صحي", points: "حسب التحدي" })).toEqual({ title: "T(earn.challenge)", points: "T(earn.perChallenge)", varies: true });
    expect(earnLabels(t, { action: "طريقة جديدة", points: "+5", reason: "new_reason" })).toEqual({ title: "طريقة جديدة", points: "+5", varies: false });
  });
});
