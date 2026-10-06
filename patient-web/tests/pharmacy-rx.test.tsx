import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cart = vi.hoisted(() => ({
  value: { items: [] as unknown[], ready: true, updateQty: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), addItem: vi.fn(), itemCount: 0, subtotal: 0, hasRxItems: false },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, footer, title }: { children: ReactNode; footer?: ReactNode; title?: string }) => <div data-shell data-title={title}>{children}{footer}</div>,
}));
vi.mock("@/lib/context/CartContext", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/context/CartContext")>()), useCart: () => cart.value }));

import { AddressCard } from "@/components-next/pharmacy/address-card";
import { BarcodeScreen } from "@/components-next/pharmacy/barcode-screen";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { CartScreen } from "@/components-next/pharmacy/cart-screen";
import { ChatScreen } from "@/components-next/pharmacy/chat-screen";
import { RequestScreen } from "@/components-next/pharmacy/request-screen";
import { RxMedicineList } from "@/components-next/pharmacy/rx-medicines";
import { RxOrderScreen } from "@/components-next/pharmacy/rx-order-screen";
import { RxUploadScreen } from "@/components-next/pharmacy/rx-upload-screen";
import { prescriptionStateTone } from "@/components-next/pharmacy/rx-state";
import { extractCartPrescription } from "@/lib/api/cart-prescription";
import { extractPrescriptionDetail, isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/api/prescriptions";
import { sanitizeCartItems } from "@/lib/context/CartContext";
import { cleanBarcode, parseBarcodeLookup } from "@/lib/pharmacy/barcode";
import { buildBroadcastBody, loadDeliveryAddresses, sendBroadcast } from "@/lib/pharmacy/broadcast";
import { isBlockedMessage, parseThreadMessages, parseThreads } from "@/lib/pharmacy/chat";
import { formatAddressLine, parseDeliveryAddresses, pickDeliveryAddress, toBroadcastAddress } from "@/lib/pharmacy/delivery-address";
import { checkRxFile, fitWithin, ocrItems, uploadedPrescriptionId } from "@/lib/pharmacy/rx-upload";
import { formatDate } from "@/lib/format-date";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const ID = "91047ef2-ad36-422a-a184-629693e7c729";
const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const located = { id: "a1", label: "Home", street: "12 King Fahd Rd", city: "Riyadh", district: "Olaya", lat: 24.7, lng: 46.7, isDefault: true };

function item(over: Record<string, unknown> = {}) {
  return { id: "m1", name: "Paracetamol 500", price: 12.5, qty: 2, rx: false, image: null, form: "Tablets", strength: "500 mg", slug: "paracetamol-500", ...over };
}

describe("the button link", () => {
  it("carries the classes the design system's Button draws, so the two cannot drift", () => {
    const buttonCss = read("components-next/ui-generated/components/css/Button.css");
    for (const cls of ["nabd-button", "nabd-button--primary", "nabd-button--outline", "nabd-button--ghost", "nabd-button--lg", "nabd-button--md", "nabd-button--full"]) expect(buttonCss).toContain(`.${cls}`);
    expect(read("components-next/ui-generated/components/Button.tsx")).toContain("nabd-button__label");
    const html = renderToStaticMarkup(<ButtonLink href="/en/cart/checkout" label="Go" fullWidth />);
    expect(html).toContain('class="nabd-button nabd-button--primary nabd-button--lg nabd-button--full');
    expect(html).toContain('href="/en/cart/checkout"');
    expect(html).toContain('<span class="nabd-button__label">Go</span>');
  });
});

describe("the cart screen (canvas/Cart)", () => {
  beforeEach(() => {
    cart.value = { ...cart.value, items: [], ready: true, subtotal: 0, hasRxItems: false };
  });

  it("draws the items of this browser with their catalogue prices, the estimate and the way to ask the pharmacies", () => {
    cart.value = { ...cart.value, items: [item(), item({ id: "m2", name: "Amoxicillin", price: 30, qty: 1, rx: true, slug: null, form: null, strength: null })], subtotal: 55, hasRxItems: true };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    expect(html).toContain("Paracetamol 500");
    expect(html).toContain('href="/en/p/paracetamol-500"');
    expect(html).toContain("SAR"); // formatted by Intl, not a hand-built string
    expect(html).toContain("25.00"); // 12.50 x 2
    expect(html).toContain("55.00"); // the estimate
    expect(html).toContain("Needs a prescription");
    expect(html).toContain("An item needs a prescription");
    expect(html).toContain('href="/en/pharmacy/scan-prescription"');
    expect(html).toContain('href="/en/cart/checkout"');
    expect(html).toContain("Set by the pharmacy&#x27;s offer"); // the delivery fee is not invented
    expect(html).toContain("This cart is saved in this browser, on this device.");
    expect(html).not.toContain("style=");
  });

  it("names the quantity controls per item, and the minus at 1 says it removes", () => {
    cart.value = { ...cart.value, items: [item({ qty: 1 }), item({ id: "m2", name: "Amoxicillin", qty: 3 })], subtotal: 100 };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    expect(html).toContain('aria-label="Remove Paracetamol 500 from the cart"');
    expect(html).toContain('aria-label="Decrease the quantity of Amoxicillin"');
    expect(html).toContain('aria-label="Increase the quantity of Amoxicillin"');
    expect(html).toContain('aria-label="Empty the cart"');
  });

  it("says a price is missing instead of drawing 0.00, and warns that the estimate is partial", () => {
    cart.value = { ...cart.value, items: [item({ price: 0 })], subtotal: 0 };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    expect(html).toContain("Price not available");
    expect(html).toContain("Some items have no catalogue price");
  });

  it("shows the empty state, with the ways out, when the cart is empty and loaded", () => {
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    expect(html).toContain("Your cart is empty");
    expect(html).toContain("Browse medicines");
    expect(html).toContain("Upload a prescription");
    expect(html).not.toContain("nabd-sticky-footer");
  });

  it("does not show the empty state before the cart of this browser has been read", () => {
    cart.value = { ...cart.value, ready: false };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    expect(html).toContain("Loading your cart");
    expect(html).not.toContain("Your cart is empty");
  });

  it("shows the account's saved lines apart, with the server's own numbers, and never mixes them into the estimate", () => {
    cart.value = { ...cart.value, items: [item()], subtotal: 25 };
    const account = { groups: [{ kind: "lab", subtotal: 90, items: [{ lineId: "l1", name: "CBC", nameEn: "Complete blood count", quantity: 1, price: 90 }] }], homeVisitFee: 50, total: 140 };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn account={account} accountFailed={false} />);
    expect(html).toContain("Saved in your account");
    expect(html).toContain("Complete blood count");
    expect(html).toContain("Laboratory");
    expect(html).toContain("140.00");
    expect(html).toContain("They are not part of the cart on this device.");
  });

  it("says when the account cart could not be read", () => {
    cart.value = { ...cart.value, items: [item()], subtotal: 25 };
    const html = renderToStaticMarkup(<CartScreen locale="en" signedIn account={null} accountFailed />);
    expect(html).toContain("could not be loaded");
  });

  it("formats money and numbers in the page's own language", () => {
    cart.value = { ...cart.value, items: [item()], subtotal: 25 };
    // the formatter, not the markup, decides the currency's name: English says SAR, Arabic says ر.س
    const en = renderToStaticMarkup(<CartScreen locale="en" signedIn={false} account={null} accountFailed={false} />);
    const ar = renderToStaticMarkup(<CartScreen locale="ar" signedIn={false} account={null} accountFailed={false} />);
    expect(en).toContain("SAR");
    expect(ar).toContain("ر.س");
    expect(ar).not.toContain("SAR");
  });
});

describe("the delivery address card", () => {
  it("draws the saved address, or why there is none, and nothing for a signed-out visitor", () => {
    const ready = renderToStaticMarkup(<AddressCard locale="en" state={{ status: "ready", address: located }} />);
    expect(ready).toContain("Deliver to");
    expect(ready).toContain("Home");
    expect(ready).toContain("12 King Fahd Rd, Olaya, Riyadh");
    expect(ready).toContain('href="/en/profile/addresses"');
    expect(renderToStaticMarkup(<AddressCard locale="en" state={{ status: "none" }} />)).toContain("Add a delivery address");
    expect(renderToStaticMarkup(<AddressCard locale="en" state={{ status: "nolocation", address: { ...located, lat: null, lng: null } }} />)).toContain("This address has no location");
    expect(renderToStaticMarkup(<AddressCard locale="en" state={{ status: "error" }} />)).toContain("could not be loaded");
    expect(renderToStaticMarkup(<AddressCard locale="en" state={{ status: "unauthenticated" }} />)).toBe("");
    expect(renderToStaticMarkup(<AddressCard locale="en" state={{ status: "loading" }} />)).toContain('aria-busy="true"');
  });
});

describe("the prescription upload screen (canvas/RxUpload)", () => {
  it("names both file inputs, offers camera and photos, and cannot be submitted without a photo", () => {
    const html = renderToStaticMarkup(<RxUploadScreen locale="en" />);
    expect(html).toContain('aria-label="Take a photo of the prescription"');
    expect(html).toContain('aria-label="Choose a prescription photo from this device"');
    expect(html).toContain('capture="environment"');
    expect(html).toContain("Camera");
    expect(html).toContain("Photos");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*Save prescription and continue/s);
    expect(html).not.toContain("style=");
    expect(html).not.toContain("<progress");
  });
});

describe("ordering from a prescription", () => {
  const prescription = { id: ID, state: "APPROVED", issuedAt: "2026-08-20T10:00:00.000Z", doctorName: "Dr Sara", items: [{ name: "Metformin", dose: "500 mg" }] };

  it("lists the prescription's medicines and waits for a saved address before it offers to send", () => {
    const html = renderToStaticMarkup(<RxOrderScreen locale="en" prescription={prescription} />);
    expect(html).toContain("Metformin");
    expect(html).toContain("Dose: 500 mg");
    expect(html).toContain("From Dr Sara");
    expect(html).toContain("Approved");
    expect(html).toContain('aria-busy="true"'); // the address is being read: no send button yet
    expect(html).not.toContain("Request pharmacy offers");
  });

  it("says a prescription with no listed medicines cannot be ordered, and what to do", () => {
    const html = renderToStaticMarkup(<RxOrderScreen locale="en" prescription={{ ...prescription, items: [] }} />);
    expect(html).toContain("No medicines are listed on this prescription");
    expect(html).not.toContain("Request pharmacy offers");
  });

  it("does not offer to order from a dispensed prescription", () => {
    const html = renderToStaticMarkup(<RxOrderScreen locale="en" prescription={{ ...prescription, state: "DISPENSED" }} />);
    expect(html).toContain("can no longer be ordered from");
  });
});

describe("the other screens render their first state without inline styles", () => {
  it("request, barcode and chat", () => {
    const request = renderToStaticMarkup(<RequestScreen locale="en" />);
    expect(request).toContain("Medicine name");
    expect(request).toContain("At least 3 characters");
    expect(request).toContain("Send to nearby pharmacies");
    const barcode = renderToStaticMarkup(<BarcodeScreen locale="en" />);
    expect(barcode).toContain("Enter the barcode printed on the package");
    expect(barcode).not.toContain("camera"); // the web does not promise a scan it does not have
    const chat = renderToStaticMarkup(<ChatScreen locale="en" orderId={ORDER} />);
    expect(chat).toContain("Loading the conversation");
    for (const html of [request, barcode, chat]) expect(html).not.toContain("style=");
  });
});

describe("medicine rows", () => {
  it("draws a row per medicine with only the lines it was given", () => {
    const html = renderToStaticMarkup(<RxMedicineList label="Medicines" items={[{ name: "A", lines: ["Dose: 1"] }, { name: "B", lines: [] }]} />);
    expect((html.match(/<li/g) || []).length).toBe(2);
    expect(html).toContain("Dose: 1");
  });
});

describe("delivery address helpers", () => {
  it("reads a bare list or { addresses }, keeps what the API sent and never invents a location", () => {
    const parsed = parseDeliveryAddresses([{ id: "a1", label: "Home", street: "S", city: "C", lat: 24.7, lng: 46.7, is_default: true }, { id: "a2", line1: "L1" }, { nope: true }]);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ id: "a2", street: "L1", lat: null, lng: null, isDefault: false });
    expect(parseDeliveryAddresses({ addresses: [{ id: "x" }] })).toHaveLength(1);
    expect(parseDeliveryAddresses(null)).toEqual([]);
  });

  it("picks the default address that has a location, else the first that has, else none", () => {
    const a = { ...located, id: "a", isDefault: false };
    const b = { ...located, id: "b", isDefault: true };
    const c = { ...located, id: "c", lat: null, lng: null, isDefault: true };
    expect(pickDeliveryAddress([a, b])?.id).toBe("b");
    expect(pickDeliveryAddress([a, c])?.id).toBe("a");
    expect(pickDeliveryAddress([c])).toBeNull();
  });

  it("joins the parts in the locale's list style and fits the broadcast DTO's length limits", () => {
    expect(formatAddressLine(located, "en")).toBe("12 King Fahd Rd, Olaya, Riyadh");
    expect(formatAddressLine({ ...located, street: null, district: null, city: null }, "en")).toBe("");
    const body = toBroadcastAddress({ ...located, label: "x".repeat(200), street: "y".repeat(400) });
    expect(body.label).toHaveLength(80);
    expect(body.street).toHaveLength(300);
    expect(body).toMatchObject({ lat: 24.7, lng: 46.7 });
  });
});

describe("sending a request to the pharmacies", () => {
  const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("builds the manual request and the prescription request the backend accepts, with no price and no payment", () => {
    const manual = buildBroadcastBody({ kind: "manual", name: "  Congestal  ", details: "" }, located);
    expect(manual).toMatchObject({ manual_request: { name: "Congestal", details: null }, fulfillment: "delivery", payment_mode: "cash" });
    expect(manual).not.toHaveProperty("items");
    const rx = buildBroadcastBody({ kind: "prescription", prescriptionId: ID, names: ["Metformin"] }, located);
    expect(rx).toMatchObject({ items: [{ raw_name: "Metformin", qty: 1, intake_source: "prescription" }], prescription_id: ID, prescription_attachments: [ID] });
    for (const body of [manual, rx]) expect(JSON.stringify(body)).not.toMatch(/price|total|card/i);
  });

  it("creates then submits with idempotency keys, and returns the order id", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const doFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.endsWith("/submit") ? ok({ data: { id: ORDER } }) : ok({ data: { id: ORDER } }, 201);
    });
    const result = await sendBroadcast({ kind: "manual", name: "Congestal", details: "" }, located, "key-1", doFetch);
    expect(result).toEqual({ ok: true, orderId: ORDER });
    expect(calls.map((c) => c.url)).toEqual(["/api/patient/patient/pharmacy/orders", `/api/patient/patient/pharmacy/orders/${ORDER}/submit`]);
    expect((calls[0].init?.headers as Record<string, string>)["idempotency-key"]).toBe("key-1");
    expect((calls[1].init?.headers as Record<string, string>)["idempotency-key"]).toBe("key-1-submit");
  });

  it("reports each way it can fail, and never reports success it did not get", async () => {
    const run = (first: Response, second?: Response) => sendBroadcast({ kind: "manual", name: "abc", details: "" }, located, "k", vi.fn(async (url: string) => (url.endsWith("/submit") ? (second as Response) : first)));
    expect(await run(ok({}, 401))).toMatchObject({ ok: false, reason: "unauthenticated" });
    expect(await run(ok({}, 500))).toMatchObject({ ok: false, reason: "create_failed", status: 500 });
    expect(await run(ok({ id: "cart" }, 201))).toMatchObject({ ok: false, reason: "no_order_id" });
    expect(await run(ok({ id: ORDER }, 201), ok({}, 400))).toMatchObject({ ok: false, reason: "submit_failed", status: 400 });
    const offline = await sendBroadcast({ kind: "manual", name: "abc", details: "" }, located, "k", vi.fn(async () => { throw new Error("network"); }));
    expect(offline).toMatchObject({ ok: false, reason: "create_failed" });
  });

  it("reads the saved addresses through the patient proxy and reports a lost session or a failure", async () => {
    expect(await loadDeliveryAddresses(vi.fn(async () => ok([{ id: "a1", lat: 1, lng: 2 }])))).toMatchObject({ status: "ok" });
    expect(await loadDeliveryAddresses(vi.fn(async () => ok({}, 401)))).toEqual({ status: "unauthenticated" });
    expect(await loadDeliveryAddresses(vi.fn(async () => ok({}, 500)))).toEqual({ status: "error" });
    expect(await loadDeliveryAddresses(vi.fn(async () => { throw new Error("x"); }))).toEqual({ status: "error" });
  });
});

describe("the prescription photo", () => {
  it("accepts a photo and refuses a non-image, an SVG and anything over 10 MB", () => {
    expect(checkRxFile({ type: "image/jpeg", size: 1000 })).toBe("ok");
    expect(checkRxFile({ type: "application/pdf", size: 1000 })).toBe("type");
    expect(checkRxFile({ type: "image/svg+xml", size: 1000 })).toBe("type");
    expect(checkRxFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 })).toBe("size");
  });

  it("is scaled down to 1600 px on its longest side and never enlarged", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("maps the OCR's fields to the ones the upload endpoint reads (a raw OCR line has no name there and is dropped)", () => {
    const items = ocrItems({ items: [{ medicine_id: null, raw_name_string: "Panadol 500", requested_quantity: 2, notes: "from OCR" }, { raw_name_string: "  " }, { name: "Augmentin" }, "x", { raw_name_string: "Lots", requested_quantity: 5000 }] });
    expect(items).toEqual([{ name: "Panadol 500", quantity: 2 }, { name: "Augmentin", quantity: 1 }, { name: "Lots", quantity: 100 }]);
    expect(ocrItems({})).toEqual([]);
    expect(ocrItems(null)).toEqual([]);
  });

  it("takes the saved prescription's id from the upload's answer", () => {
    expect(uploadedPrescriptionId({ id: ID })).toBe(ID);
    expect(uploadedPrescriptionId({ data: { id: ID } })).toBe(ID);
    expect(uploadedPrescriptionId({})).toBeNull();
  });
});

describe("barcode lookup", () => {
  const medicine = { id: "m1", slug: "panadol", name_ar: "بنادول", name_en: "Panadol", form: "Tablets", strength: "500 mg", manufacturer: "GSK", price: 12, requires_prescription: false };

  it("tells an exact barcode match from the backend's name match, which is not a recognised barcode", () => {
    expect(parseBarcodeLookup({ found: true, source: "catalog", medicine }, "en")).toMatchObject({ kind: "exact", medicine: { name: "Panadol", slug: "panadol", price: 12 } });
    expect(parseBarcodeLookup({ found: true, source: "fuzzy", medicine }, "en")?.kind).toBe("closest");
    expect(parseBarcodeLookup({ found: true, source: "catalog", medicine }, "ar")?.medicine.name).toBe("بنادول");
  });

  it("is a miss when nothing was found, and draws no price for a medicine that has none", () => {
    expect(parseBarcodeLookup({ found: false, source: "none", medicine: null }, "en")).toBeNull();
    expect(parseBarcodeLookup({ found: true, source: "catalog", medicine: { ...medicine, price: 0 } }, "en")?.medicine.price).toBeUndefined();
    expect(cleanBarcode(" 6281 2345 ")).toBe("62812345");
    expect(cleanBarcode("1".repeat(80))).toHaveLength(64);
  });
});

describe("pharmacist chat data", () => {
  it("reads threads and keeps only what is drawn", () => {
    const threads = parseThreads([{ id: "t1", status: "open", order_id: ORDER, pharmacy_account_id: "private" }, { id: "t2", status: "closed", resolution: "rejected" }, { status: "open" }]);
    expect(threads).toEqual([{ id: "t1", open: true, resolution: undefined }, { id: "t2", open: false, resolution: "rejected" }]);
    expect(JSON.stringify(threads)).not.toContain("private");
  });

  it("leaves out the backend's Arabic-only system lines, and reads a substitute offer's name and price", () => {
    const parsed = parseThreadMessages({
      thread: { id: "t1", status: "closed", resolution: "accepted" },
      messages: [
        { id: "m1", sender_role: "pharmacy", text: "Hello", createdAt: "2026-10-01T10:00:00Z", substitute_offer: { name: "Generic", price: 9 } },
        { id: "m2", sender_role: "system", text: "تم" },
        { id: "m3", sender_role: "patient", text: "Thanks" },
      ],
    });
    expect(parsed.messages.map((m) => m.id)).toEqual(["m1", "m3"]);
    expect(parsed.messages[0].offer).toEqual({ name: "Generic", sku: undefined, price: 9 });
    expect(parsed.thread).toEqual({ id: "t1", open: false, resolution: "accepted" });
  });

  it("recognises the backend's blocked-message answer", () => {
    expect(isBlockedMessage({ code: "content_blocked" })).toBe(true);
    expect(isBlockedMessage({ message: { code: "content_blocked" } })).toBe(true);
    expect(isBlockedMessage({ message: "x" })).toBe(false);
  });
});

describe("prescription data", () => {
  it("reads the patient's bounded view and nothing else", () => {
    const detail = extractPrescriptionDetail({ id: ID, status: "APPROVED", items: [{ name: "Metformin", dose: "500 mg", frequency: { every_hours: 8 }, duration: 30 }, { name: "  " }, { name: "Vit D", frequency: { times_per_day: 1 } }], issued_at: "2026-08-20T10:00:00.000Z", doctor: { display_name: "Dr Sara", specialty: "Endo" }, diagnosis: "private", upload_image: "private" });
    expect(detail).toEqual({ id: ID, state: "APPROVED", issuedAt: "2026-08-20T10:00:00.000Z", doctorName: "Dr Sara", doctorSpecialty: "Endo", items: [{ name: "Metformin", dose: "500 mg", everyHours: 8, timesPerDay: undefined, durationDays: 30 }, { name: "Vit D", dose: undefined, everyHours: undefined, timesPerDay: 1, durationDays: undefined }] });
    expect(JSON.stringify(detail)).not.toContain("private");
    expect(extractPrescriptionDetail({ id: "not-a-uuid" })).toBeNull();
  });

  it("never lets a raw state enum through: each known state has a message, an unknown one has the fallback", () => {
    const messages = JSON.parse(read("messages/en.json")).Prescriptions as Record<string, string>;
    for (const state of ["CREATED_BY_DOCTOR", "UPLOADED_BY_PATIENT", "SENT_TO_PHARMACY", "PARTIALLY_EDITED", "VERIFIED_BY_PHARMACIST", "APPROVED", "DISPENSED", "ARCHIVED"]) expect(messages[prescriptionStateKey(state)]).toBeTruthy();
    expect(prescriptionStateKey("SOMETHING_NEW")).toBe("stateUnavailable");
    expect(prescriptionStateKey(undefined)).toBe("stateUnavailable");
    expect(isOrderablePrescriptionState("APPROVED")).toBe(true);
    expect(isOrderablePrescriptionState("DISPENSED")).toBe(false);
    expect(isOrderablePrescriptionState("ARCHIVED")).toBe(false);
    expect(["amber", "mint", "blue"]).toContain(prescriptionStateTone("UPLOADED_BY_PATIENT"));
  });

  it("reads the cart's prescription, and says there is none when the API says so", () => {
    expect(extractCartPrescription({ prescription_id: null, medications: [] })).toBeNull();
    expect(extractCartPrescription({ prescription_id: ID, date: "2026-08-20T10:00:00.000Z", medications: [{ id: "m", name: "Metformin", dose: "500 mg", qty: 2, requiresRx: true }, { name: "" }] })).toEqual({ id: ID, date: "2026-08-20T10:00:00.000Z", medications: [{ name: "Metformin", dose: "500 mg", quantity: 2 }] });
  });

  it("formats a date through the locale, and a bad value as nothing, never 'Invalid Date'", () => {
    expect(formatDate("en", "2026-08-20T10:00:00.000Z")).toContain("2026");
    expect(formatDate("en", "nonsense")).toBeNull();
    expect(formatDate("en", undefined)).toBeNull();
  });
});

describe("the cart kept in this browser", () => {
  it("keeps only usable lines of what localStorage holds", () => {
    const kept = sanitizeCartItems([item(), { id: "x" }, { ...item({ id: "m3" }), qty: 0 }, { ...item({ id: "m4" }), price: -1 }, null, "x", { ...item({ id: "m5" }), qty: 500, rx: "yes" }]);
    expect(kept.map((line) => line.id)).toEqual(["m1", "m5"]);
    expect(kept[1]).toMatchObject({ qty: 99, rx: false });
    expect(sanitizeCartItems("nope")).toEqual([]);
  });
});

describe("client bundles of the Batch 1b screens", () => {
  /** Every module a client screen reaches through "@/..." and relative imports (not node_modules). */
  function reach(file: string, seen = new Set<string>()): Set<string> {
    if (seen.has(file)) return seen;
    seen.add(file);
    const source = read(file);
    for (const match of source.matchAll(/from\s+"((?:@\/|\.\.?\/)[^"]+)"/g)) {
      const spec = match[1];
      const base = spec.startsWith("@/") ? spec.slice(2) : resolve(file, "..", spec).slice(process.cwd().length + 1);
      const found = [".ts", ".tsx", "/index.ts"].map((ext) => `${base}${ext}`).find((candidate) => { try { read(candidate); return true; } catch { return false; } });
      if (found) reach(found, seen);
    }
    return seen;
  }

  it("never reach zod: it probes for eval, which the page's CSP reports as a violation on every page that loads it", () => {
    for (const screen of ["cart-screen", "rx-upload-screen", "rx-order-screen", "request-screen", "barcode-screen", "chat-screen"]) {
      const modules = [...reach(`components-next/pharmacy/${screen}.tsx`)];
      const offenders = modules.filter((module) => /from\s+"zod"/.test(read(module)));
      expect(offenders, screen).toEqual([]);
    }
  });
});

describe("messages of the Batch 1b screens", () => {
  const NAMESPACES = ["CartScreen", "PharmacyFlow", "PharmacyAddress", "RxUpload", "PharmacyRequest", "PharmacyBarcode", "PharmacyChat", "Prescriptions"];
  const locales = ["ar", "en", "ur", "hi", "bn", "fil"];
  const data = Object.fromEntries(locales.map((l) => [l, JSON.parse(read(`messages/${l}.json`)) as Record<string, Record<string, string>>]));
  // the arguments of an ICU message: the sub-messages of a plural ({one {...}}) are not arguments
  const slots = (message: string) => [...message.replace(/\b(?:zero|one|two|few|many|other|=\d+)\s*\{[^{}]*\}/g, "").matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(",");

  it("has every key in every language, non-empty, with the same {slots}", () => {
    for (const ns of NAMESPACES) {
      const keys = Object.keys(data.en[ns]);
      expect(keys.length, ns).toBeGreaterThan(0);
      for (const locale of locales) {
        expect(Object.keys(data[locale][ns]).sort(), `${locale}.${ns}`).toEqual([...keys].sort());
        for (const key of keys) {
          const value = data[locale][ns][key];
          expect(typeof value === "string" && value.trim().length > 0, `${locale}.${ns}.${key}`).toBe(true);
          expect(slots(value), `${locale}.${ns}.${key}`).toBe(slots(data.en[ns][key]));
        }
      }
    }
  });

  it("uses every key the screens ask for (no key is missing from the files)", () => {
    const files: Array<[string, string]> = [
      ["components-next/pharmacy/cart-screen.tsx", "CartScreen"],
      ["components-next/pharmacy/rx-upload-screen.tsx", "RxUpload"],
      ["components-next/pharmacy/request-screen.tsx", "PharmacyRequest"],
      ["components-next/pharmacy/barcode-screen.tsx", "PharmacyBarcode"],
      ["components-next/pharmacy/chat-screen.tsx", "PharmacyChat"],
      ["components-next/pharmacy/address-card.tsx", "PharmacyAddress"],
    ];
    for (const [file, ns] of files) {
      const source = read(file);
      for (const match of source.matchAll(/\bt\(\s*"(\w+)"/g)) expect(data.en[ns], `${file} t("${match[1]}")`).toHaveProperty(match[1]);
    }
  });
});
