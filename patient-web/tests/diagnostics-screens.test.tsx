import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { CheckField, LabCard, PackageCard, RadiologyTile, SearchForm, TestList, TestRow, hoursText, money, pickText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { DiagnosticsCartClient } from "@/components-next/diagnostics-cart-client";
import { DiagnosticsCheckoutForm } from "@/components-next/diagnostics-checkout-form";
import { DiagnosticsDocumentUpload } from "@/components-next/diagnostics-document-upload";
import { DiagnosticsSearchClient } from "@/components-next/diagnostics-search-client";
import { LabBookingForm } from "@/components-next/lab-booking-form";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/\u00a0/g, " ");
const plain = (value: string) => value.replace(/\u00a0/g, " ");

describe("the diagnostics parts (template of the catalogue screens)", () => {
  it("draws a test row: the name as a link, the tags, the price in the page's locale and a 44 px add link with a name", () => {
    const out = html(
      <TestList label="Tests">
        <TestRow href="/en/diagnostics/test-detail?testId=cbc" title="CBC" tags={[{ label: "Fasting", tone: "amber" }]} note="Result within 24 hours" price={plain(money("en", 20))} addHref="/en/diagnostics/cart?add=cbc" addLabel="Add CBC to my order" />
      </TestList>,
    );
    expect(out).toContain('href="/en/diagnostics/test-detail?testId=cbc"');
    expect(out).toContain("Fasting");
    expect(out).toContain("Result within 24 hours");
    expect(out).toContain("SAR");
    expect(out).toContain('aria-label="Add CBC to my order"');
    expect(out).not.toContain("style=");
  });

  it("draws a row without a price, a tag or an add link when the server sent none of them", () => {
    const out = html(<TestList label="Tests"><TestRow href="/x" title="TSH" /></TestList>);
    expect(out).toContain("TSH");
    expect(out).not.toContain("aria-label=\"Add");
    expect(out).not.toContain("SAR");
  });

  it("draws a package card, a radiology tile and a lab card as links, with the price and the old price only when given", () => {
    expect(html(<PackageCard href="/en/diagnostics/packages/p1" title="Wellness" count="Includes 3 tests" price="SAR 120.00" was="SAR 150.00" cta="Details" />)).toMatch(/href="\/en\/diagnostics\/packages\/p1"[^>]*>.*Wellness.*SAR 120.00.*SAR 150.00.*Details/);
    expect(html(<PackageCard href="/p" title="Plain" cta="Details" />)).not.toContain("SAR");
    const tile = html(<ul><RadiologyTile href="/en/diagnostics/radiology/r1" title="Chest X-Ray" sub="From SAR 90.00" tags={[{ label: "Contrast", tone: "amber" }]} /></ul>);
    expect(tile).toContain("Chest X-Ray");
    expect(tile).toContain("Contrast");
    const lab = html(<ul><LabCard href="/en/diagnostics/labs/l1" title="City Lab" sub="Riyadh" price="SAR 40.00" /></ul>);
    expect(lab).toContain("City Lab");
    expect(lab).toContain("SAR 40.00");
  });

  it("draws the search form as a GET form with a labelled field and the filters under it", () => {
    const out = html(<SearchForm action="/en/diagnostics/search" placeholder="Search" label="Search labs" submitLabel="Search" below={<CheckField name="home" label="Home collection" defaultChecked />} />);
    expect(out).toContain('method="get"');
    expect(out).toContain('action="/en/diagnostics/search"');
    expect(out).toContain('role="search"');
    expect(out).toContain('name="home"');
    expect(out).toContain("checked");
  });

  it("groups the booking states into the few phrases a patient reads and never draws a raw code", () => {
    expect(diagStatus("PENDING_ACCEPTANCE").key).toBe("pending");
    expect(diagStatus("WAITING_COPAY").key).toBe("insurance");
    expect(diagStatus("report_uploaded").key).toBe("report");
    expect(diagStatus("SCAN_ABORTED").key).toBe("cancelled");
    expect(diagStatus("SOMETHING_NEW").key).toBe("unknown");
    expect(diagStatus(undefined).key).toBe("unknown");
  });

  it("picks the Arabic text for Arabic and Urdu, the English text for the others, and the other one when one is missing", () => {
    expect(pickText("ar", "عربي", "English")).toBe("عربي");
    expect(pickText("ur", "عربي", "English")).toBe("عربي");
    expect(pickText("en", "عربي", "English")).toBe("English");
    expect(pickText("hi", "عربي", undefined)).toBe("عربي");
    expect(pickText("en", undefined, undefined)).toBeUndefined();
  });

  it("writes money and durations through Intl in the page's locale", () => {
    expect(plain(money("en", 20))).toBe("SAR 20.00");
    expect(money("ar", 20)).not.toBe(money("en", 20));
    expect(hoursText("en", 24)).toBe("24 hours");
  });
});

describe("the diagnostics client screens", () => {
  it("the cart renders its empty state on the server (the cart is read from this browser after the page is on screen)", () => {
    const out = html(<DiagnosticsCartClient locale="en" />);
    expect(out).toContain("Your cart is empty");
    expect(out).toContain("Browse tests");
    expect(out).not.toContain("style=");
  });

  it("the checkout offers card or insurance for a home sample, and cash too at the lab, with a 7 day picker and an address only at home", () => {
    const home = html(<DiagnosticsCheckoutForm locale="en" items={["cbc"]} labId="lab-1" initialLocation="home" />);
    expect(home).toContain("Card");
    expect(home).toContain("Insurance");
    expect(home).not.toMatch(/>Cash</);
    expect(home).toContain("Address for the home sample");
    expect((home.match(/aria-pressed/g) ?? []).length).toBe(7 + 6 + 2);
    const facility = html(<DiagnosticsCheckoutForm locale="en" items={["cbc"]} labId="lab-1" initialLocation="facility" />);
    expect(facility).toMatch(/>Cash</);
    expect(facility).not.toContain("Address for the home sample");
    expect(facility).not.toContain("style=");
  });

  it("the lab booking disables the home sample when the test has none, and cash when it is at home", () => {
    const noHome = html(<LabBookingForm locale="en" serviceId="cbc" providerId="p1" serviceName="CBC" homeEligible={false} />);
    expect(noHome).toMatch(/<button[^>]*disabled[^>]*>Home sample/);
    expect(noHome).toContain("A home sample is not available for this test.");
    const withHome = html(<LabBookingForm locale="en" serviceId="cbc" providerId="p1" serviceName="CBC" homeEligible />);
    expect(withHome).not.toMatch(/<button[^>]*disabled[^>]*>Home sample/);
    expect(withHome).toContain("Confirm the booking");
    expect(withHome).not.toContain("style=");
  });

  it("the insurance upload and the search render their fields with labels", () => {
    const upload = html(<DiagnosticsDocumentUpload locale="en" bookingId="b1" />);
    expect(upload).toContain("Doctor&#x27;s request");
    expect(upload).toContain('type="file"');
    const search = html(<DiagnosticsSearchClient locale="en" initialQuery="" services={[{ id: "cbc", name: "CBC", price: 20 }]} />);
    expect(search).toContain("/en/diagnostics/test-detail?testId=cbc");
    expect(search).toContain("SAR 20.00");
  });
});

describe("the flows the redesign must not touch", () => {
  it("the checkout still creates the order with an idempotency key, pays by card once for the order and clears the cart", () => {
    const source = code("components-next/diagnostics-checkout-form.tsx");
    expect(source).toContain('fetch("/api/diagnostics/orders"');
    expect(source).toContain('"idempotency-key": `web-diag-${Date.now()}');
    expect(source).toContain('fetch("/api/payments/intent/diagnostics"');
    expect(source).toContain('"idempotency-key": `web-diag-pay-${orderId}`');
    expect(source).toContain('fetch("/api/diagnostics/cart", { method: "DELETE" })');
    expect(source).toContain('localStorage.removeItem("nabd-diagnostics-cart")');
  });

  it("the lab booking still posts once with one idempotency key and the same body", () => {
    const source = code("components-next/lab-booking-form.tsx");
    expect(source).toContain('fetch("/api/patient/labs/bookings"');
    expect(source).toContain("key.current ??= crypto.randomUUID()");
    expect(source).toContain("provider_account_id: providerId");
  });

  it("the cart still stores its items under the same key in this browser", () => {
    const source = code("components-next/diagnostics-cart-client.tsx");
    expect(source).toContain('const KEY = "nabd-diagnostics-cart"');
    expect(source).toContain("/api/diagnostics/compatible-labs?testIds=");
  });

  it("none of the screens writes an inline style, a raw colour or a fake booking", () => {
    for (const file of ["components-next/diagnostics-cart-client.tsx", "components-next/diagnostics-checkout-form.tsx", "components-next/lab-booking-form.tsx", "components-next/diagnostics-insurance-approval-client.tsx", "components-next/diagnostics-sample-tracking-client.tsx", "components-next/diagnostics-document-upload.tsx", "components-next/diagnostics-search-client.tsx", "components-next/diagnostics/diag-parts.tsx"]) {
      const source = code(file);
      expect(source, file).not.toMatch(/style=\{/);
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(source, file).not.toContain("Math.random() *");
      expect(source, file).not.toContain("service-booking-modal");
    }
  });
});
