import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderContextBar } from "@/components-next/ordering/order-context-bar";
import { defaultAddressLine, insuranceClass } from "@/components-next/ordering/order-context";

const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/ /g, " ");

describe("Ord01 order context (saved profile, existing reads only)", () => {
  it("takes the default address, else the first, and joins its parts once", () => {
    expect(defaultAddressLine([{ street: "Olaya St", city: "Riyadh", is_default: false }, { street: "Narjis", district: "Narjis", city: "Riyadh", is_default: true }])).toBe("Narjis · Riyadh");
    expect(defaultAddressLine({ addresses: [{ line1: "Tahlia", city: "Jeddah" }] })).toBe("Tahlia · Jeddah");
    expect(defaultAddressLine([])).toBeNull();
    expect(defaultAddressLine(null)).toBeNull();
  });

  it("reads the insurance class and never shows an empty policy", () => {
    expect(insuranceClass({ provider: "bupa", class: "A" })).toEqual({ hasPolicy: true, cls: "A" });
    expect(insuranceClass({ provider: "bupa" })).toEqual({ hasPolicy: true, cls: null });
    expect(insuranceClass(null)).toEqual({ hasPolicy: false, cls: null });
    expect(insuranceClass({ class: "A" })).toEqual({ hasPolicy: false, cls: null });
  });

  const base = {
    label: "Where",
    placeLabel: "Where",
    place: "home",
    placeOptions: [
      { value: "home", label: "Home sample", href: "/en/diagnostics?place=home" },
      { value: "facility", label: "At the lab", href: "/en/diagnostics?place=facility" },
    ],
    payLabel: "Payment",
    pay: "self_pay",
    payOptions: [{ value: "self_pay", label: "Without insurance", href: "/en/diagnostics" }, { value: "insurance", label: "Insurance", href: "/en/diagnostics?pay=insurance" }],
    addressHref: "/en/profile/addresses",
    insuranceHref: "/en/profile",
    copy: { hint: "Prices update at once", addAddress: "Add your address", addInsurance: "Add your insurance", insuranceSub: "Estimate until approval", insuranceName: "Insurance" },
  };

  it("shows the saved address and insurance, or the links to add them", () => {
    const saved = html(<OrderContextBar {...base} address="Narjis · Riyadh" insurance={{ hasPolicy: true, cls: "A" }} />);
    expect(saved).toContain("Narjis · Riyadh");
    expect(saved).toContain("Insurance · A");
    expect(saved).toContain("Estimate until approval");
    const empty = html(<OrderContextBar {...base} address={null} insurance={{ hasPolicy: false, cls: null }} />);
    expect(empty).toContain('href="/en/profile/addresses"');
    expect(empty).toContain('href="/en/profile"');
    expect(empty).toContain("Add your address");
  });

  it("without a session it shows only the two choices, as links that keep the choice in the URL", () => {
    const out = html(<OrderContextBar {...base} />);
    expect(out).toContain('href="/en/diagnostics?place=facility"');
    expect(out).toContain('href="/en/diagnostics?pay=insurance"');
    expect(out).not.toContain("Add your address");
    expect(out).toContain('aria-current="page"');
  });
});
