import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { OrderContextBar } from "@/components-next/ordering/order-context-bar";
import { contextQuery, whoOf } from "./context";
import { buildBookingRequest } from "./schedule";
import { buildRadiologyRequests } from "./radiology";

const read = (rel: string) => readFileSync(join(__dirname, "..", "..", rel), "utf8");
const MEMBER = "member-0001-abcd";

describe("owner decision 2026-11-08 (1): an order is for the patient or a family member, default the patient", () => {
  it("reads the member from the address as a plain id only, and writes it only when there is one", () => {
    expect(whoOf(MEMBER)).toBe(MEMBER);
    expect(whoOf(undefined)).toBeUndefined();
    expect(whoOf("../x")).toBeUndefined();
    expect(whoOf("short")).toBeUndefined();
    expect(contextQuery({ kind: "lab", place: "home", pay: "cash" })).toBe(""); // the patient: nothing written
    expect(contextQuery({ kind: "lab", place: "home", pay: "cash", who: MEMBER })).toBe(`?for=${MEMBER}`);
    expect(contextQuery({ kind: "radiology", place: "facility", pay: "insurance", who: MEMBER, item: "x1" })).toBe(`?kind=radiology&place=facility&pay=insurance&for=${MEMBER}&item=x1`);
  });

  it("sends family_member_id with the booking only when another member is chosen", () => {
    const schedule = { quoteId: "q1", home: { type: "window" as const, start: "2030-01-02T08:00:00.000Z", end: "2030-01-02T10:00:00.000Z" } } as never;
    const mine = buildBookingRequest({ schedule, home: "p1", insured: false });
    const theirs = buildBookingRequest({ schedule, home: "p1", insured: false, familyMemberId: MEMBER });
    expect(mine && "family_member_id" in mine).toBe(false);
    expect(theirs?.family_member_id).toBe(MEMBER);
    const sch = { quoteId: "q1", facility: { type: "slot" as const, id: "s1", start: "2030-01-02T08:00:00.000Z" } } as never;
    const scan = (familyMemberId?: string) => buildRadiologyRequests({ schedule: sch, facility: "p1", groups: { facility: { itemIds: ["scan1"] } }, insured: false, familyMemberId });
    expect(scan()?.[0].body).not.toHaveProperty("family_member_id");
    expect(scan(MEMBER)?.[0].body.family_member_id).toBe(MEMBER);
  });

  it("draws the For-whom chip with the patient first and selected, only when there is a family member", () => {
    const base = { label: "ctx", place: "home", placeOptions: [{ value: "home", label: "Home", href: "/x" }], placeLabel: "Where", payLabel: "Pay", addressHref: "/a", insuranceHref: "/i", copy: { hint: "h", addAddress: "a", addInsurance: "i", insuranceSub: "s", insuranceName: "n" } };
    const who = (n: number) => ({ label: "For whom", current: "me", options: [{ value: "me", label: "Me", href: "/p" }, ...Array.from({ length: n }, (_, i) => ({ value: `m${i}`, label: `Member ${i}`, href: `/p?for=m${i}` }))] });
    const withMember = renderToStaticMarkup(createElement(OrderContextBar, { ...base, who: who(1) }));
    expect(withMember).toContain("For whom");
    expect(withMember).toContain("Member 0");
    expect(withMember).toContain('href="/p?for=m0"');
    expect(renderToStaticMarkup(createElement(OrderContextBar, { ...base, who: who(0) }))).not.toContain("For whom"); // nobody else to order for
    expect(renderToStaticMarkup(createElement(OrderContextBar, base))).not.toContain("For whom");
  });

  it("is wired from the chip to the quote, the ASAP request and the bookings, and the BFF routes keep the field", () => {
    expect(read("components-next/ordering/basket-client.tsx")).toContain("family_member_id: who");
    expect(read("components-next/ordering/providers-client.tsx")).toContain("family_member_id: who");
    expect(read("components-next/ordering/when-client.tsx")).toContain("family_member_id: who");
    expect(read("components-next/ordering/confirm-client.tsx")).toContain("familyMemberId: who");
    expect(read("app/[locale]/labs/[testSlug]/page.tsx")).toContain("family_member_id: who");
    for (const route of ["bookings", "asap", "radiology-bookings"]) expect(read(`app/api/ordering/${route}/route.ts`)).toContain("family_member_id");
    expect(read("components-next/ordering/ordering-context.tsx")).toContain('filter((m) => m.role !== "owner")');
  });

  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("the two strings exist in %s", async (l) => {
    const m = (await import(`../../messages/${l}.json`)).default as { OrderContext: Record<string, string> };
    expect((m.OrderContext.forLabel ?? "").length).toBeGreaterThan(2);
    expect((m.OrderContext.forMe ?? "").length).toBeGreaterThan(1);
  });
});
