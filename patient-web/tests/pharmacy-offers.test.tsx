import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
}));

import { OfferList, lowestPriceIds, sortOffers, type OfferView } from "@/components-next/pharmacy-offers/offer-list";
import { QuoteSection } from "@/components-next/pharmacy-offers/quote-section";
import { createActionRunner, classifyError, errorCode } from "@/components-next/pharmacy-offers/use-pharmacy-action";
import { formatMoney, formatRemaining } from "@/components-next/pharmacy-offers/format";
import { statusKey } from "@/components-next/pharmacy-offers/status";
import { LocalTime } from "@/components-next/pharmacy-offers/local-time";
import { extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";

const ORDER = "91047ef2-ad36-422a-a184-629693e7c729";
const HASH = "a".repeat(64);

const offer = (over: Partial<OfferView> = {}): OfferView => ({
  id: "123e4567-e89b-12d3-a456-426614174000", open: true, pharmacyName: "TEST pharmacy", total: 51.5, subtotal: 46.5, deliveryFee: 5, currency: "SAR",
  lines: [{ id: "l1", name: "TEST item", quantity: 2, unitPrice: 18, available: true }, { id: "l2", name: "TEST item two", quantity: 1, unitPrice: 10.5, available: true }], ...over,
});

describe("offer ordering", () => {
  const cheap = offer({ id: "a", total: 30, preparationMinutes: 40, distanceKm: 4 });
  const mid = offer({ id: "b", total: 40, preparationMinutes: 15, distanceKm: 1 });
  const none = offer({ id: "c", total: undefined, preparationMinutes: undefined, distanceKm: undefined });

  it("sorts by the server's own value, an offer without it last, and never changes a number", () => {
    expect(sortOffers([none, mid, cheap], "price").map((o) => o.id)).toEqual(["a", "b", "c"]);
    expect(sortOffers([none, cheap, mid], "fast").map((o) => o.id)).toEqual(["b", "a", "c"]);
    expect(sortOffers([none, cheap, mid], "near").map((o) => o.id)).toEqual(["b", "a", "c"]);
    expect(sortOffers([cheap, mid], "price").map((o) => o.total)).toEqual([30, 40]);
  });

  it("the lowest-price badge needs a comparison and an offer that fills every line", () => {
    expect(lowestPriceIds([cheap])).toEqual(new Set());
    expect(lowestPriceIds([cheap, mid])).toEqual(new Set(["a"]));
    const partial = offer({ id: "p", total: 5, lines: [{ id: "l", name: "x", available: false }] });
    expect(lowestPriceIds([partial, cheap, mid])).toEqual(new Set(["a"]));
    expect(lowestPriceIds([partial, none])).toEqual(new Set());
  });
});

describe("OfferList", () => {
  it("draws the server's totals and unit prices as sent, through the locale formatter, with no style attribute", () => {
    const html = renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer()]} />);
    expect(html).not.toContain("style=");
    expect(html).toContain("SAR 51.50"); // en: the total the server sent
    expect(html).toContain("SAR 46.50"); // subtotal as sent
    expect(html).toContain("SAR 5.00"); // delivery as sent
    expect(html).toContain("SAR 18.00"); // a unit price as sent
    // 2 x 18 + 10.5 would be 46.5 and 51.5 with delivery: the page never shows a figure it computed (no "36.00" line total)
    expect(html).not.toContain("36.00");
    expect(html).toContain("selectOffer");
  });

  it("an offer text from the pharmacy is drawn as text, never as markup", () => {
    const html = renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ pharmacyName: "<img src=x onerror=alert(1)>", note: "<script>alert(1)</script>" })]} />);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("an offer with no price cannot be selected and says so: no invented total", () => {
    const html = renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ total: undefined, subtotal: undefined, deliveryFee: undefined })]} />);
    expect(html).toContain("priceMissing");
    expect(html).not.toContain("0.00");
    expect(html).toMatch(/nabd-button[^"]*--disabled/);
  });

  it("offers the insurance choice only when the server says the offer is insurance-ready", () => {
    expect(renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ insuranceReady: true })]} />)).toContain("coverageInsurance");
    expect(renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ insuranceReady: false })]} />)).not.toContain("coverageInsurance");
  });

  it("a non-open offer has no select button", () => {
    expect(renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ open: false })]} />)).not.toContain("selectOffer");
  });
});

describe("QuoteSection", () => {
  const base = { selected_offer_snapshot: { totals: { subtotal: 46.5, delivery_fee: 5, total: 51.5, currency: "SAR" }, hash: HASH }, selected_offer_hash: HASH, selected_offer_revision: 2 };
  const draw = async (order: Record<string, unknown>, screen: "offers" | "final" = "final") =>
    renderToStaticMarkup(await QuoteSection({ locale: "en", orderId: ORDER, progress: extractPatientPharmacyOrderProgress(order) ?? {}, screen }));

  it("OFFER_SELECTED: the server's price and an accept button bound to the server's hash and revision", async () => {
    const html = await draw({ governed_state: "OFFER_SELECTED", ...base });
    expect(html).toContain("SAR 51.50");
    expect(html).toContain("quoteAccept");
    expect(html).not.toContain("style=");
  });

  it("without a server hash and revision there is nothing to accept", async () => {
    const html = await draw({ governed_state: "OFFER_SELECTED", selected_offer_snapshot: base.selected_offer_snapshot });
    expect(html).not.toContain("quoteAccept");
    expect(html).toContain("quoteNone");
  });

  it("an insurance order is never offered the cash final-price acceptance outside its own state", async () => {
    const html = await draw({ governed_state: "INSURANCE_PROCESSING", ...base });
    expect(html).not.toContain("quoteAccept");
  });

  it("FINAL_QUOTE_ACCEPTED: cash on delivery only when the server allows it for a cash order", async () => {
    const accepted = { governed_state: "FINAL_QUOTE_ACCEPTED", ...base, accepted_quote_snapshot: { cod_allowed: true, totals: { total: 51.5 } } };
    expect(await draw({ ...accepted, coverage_mode: "cash" })).toContain("codRegister");
    expect(await draw({ ...accepted, coverage_mode: "insurance" })).not.toContain("codRegister");
    expect(await draw({ ...accepted, coverage_mode: "cash", accepted_quote_snapshot: { cod_allowed: false, totals: { total: 51.5 } } })).not.toContain("codRegister");
  });

  it("COD_REGISTERED says it is a commitment and links to tracking, with no payment control", async () => {
    const html = await draw({ governed_state: "COD_REGISTERED", ...base });
    expect(html).toContain("codRegistered");
    expect(html).toContain(`/en/orders/${ORDER}/tracking`);
    expect(html).not.toContain("quoteAccept");
  });
});

describe("the mutation runner", () => {
  const response = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

  it("sends one request at a time: a second press while one is in flight sends nothing", async () => {
    let release: (r: Response) => void = () => undefined;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolveFetch) => { release = resolveFetch; }));
    const runner = createActionRunner(fetchImpl as unknown as typeof fetch, () => "key-1");
    const first = runner.run("select:a", "/api/x", { a: 1 });
    expect(await runner.run("select:a", "/api/x", { a: 1 })).toBeNull();
    release(response(201));
    expect((await first)?.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]).toEqual(["/api/x", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "idempotency-key": "key-1" }) })]);
  });

  it("reuses the idempotency key after a dropped connection or a 5xx, and makes a fresh one after an answer", async () => {
    let n = 0;
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(400, { message: "offer_not_selectable" }))
      .mockResolvedValueOnce(response(201));
    const runner = createActionRunner(fetchImpl as unknown as typeof fetch, () => `key-${++n}`);
    expect(await runner.run("a", "/p")).toEqual({ ok: false, kind: "network", status: 0 });
    expect(await runner.run("a", "/p")).toEqual({ ok: false, kind: "network", status: 503 });
    expect(await runner.run("a", "/p")).toEqual({ ok: false, kind: "offerGone", status: 400 });
    expect(await runner.run("a", "/p")).toMatchObject({ ok: true });
    const keys = fetchImpl.mock.calls.map((call) => (call[1] as { headers: Record<string, string> }).headers["idempotency-key"]);
    expect(keys).toEqual(["key-1", "key-1", "key-1", "key-2"]);
  });

  it("turns the server's reason into a kind the screen can say in words, and success is never assumed", () => {
    expect(errorCode({ message: "another_offer_already_selected" })).toBe("another_offer_already_selected");
    expect(errorCode({ message: { code: "content_blocked" } })).toBe("content_blocked");
    expect(errorCode(null)).toBeUndefined();
    expect(classifyError(400, "another_offer_already_selected")).toBe("alreadySelected");
    expect(classifyError(400, "quote_hash_or_revision_mismatch")).toBe("quoteChanged");
    expect(classifyError(403, "Insufficient role")).toBe("forbidden");
    expect(classifyError(401)).toBe("signedOut");
    expect(classifyError(502)).toBe("network");
    expect(classifyError(400, "something_new")).toBe("generic");
  });
});

describe("times", () => {
  it("a time is written by the browser after mount, so the server render never holds a server-zone string", () => {
    const html = renderToStaticMarkup(<LocalTime iso="2026-10-06T10:00:00.000Z" locale="hi" />);
    expect(html).toBe('<time dateTime="2026-10-06T10:00:00.000Z"></time>');
  });
  it("the absolute validity of an offer is not drawn on the server either", () => {
    const html = renderToStaticMarkup(<OfferList orderId={ORDER} after="refresh" offers={[offer({ expiresAt: "2099-10-06T10:00:00.000Z" })]} />);
    expect(html).not.toContain("validUntil");
  });
});

describe("formatting", () => {
  it("money, remaining time and order statuses go through Intl and the translation keys", () => {
    expect(formatMoney("en", 33.5)).toBe("SAR 33.50");
    expect(formatMoney("ar", 33.5)).not.toBe(formatMoney("en", 33.5));
    expect(formatMoney("en", 12, "USD")).toBe("$12.00");
    expect(formatRemaining("en", 90_000)).toBe("1 minute");
    expect(statusKey("Broadcasting")).toBe("broadcasting");
    expect(statusKey("something_else")).toBe("other");
    expect(statusKey(undefined)).toBe("other");
  });
});

describe("PharmacyOffers translations", () => {
  const read = (locale: string) => JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8")).PharmacyOffers as Record<string, unknown>;
  const flat = (value: unknown, prefix = ""): string[] => (value && typeof value === "object" ? Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)) : [prefix]);
  it("has the same keys, none empty, in all six languages", () => {
    const english = flat(read("en")).sort();
    expect(english.length).toBeGreaterThan(100);
    for (const locale of ["ar", "ur", "hi", "bn", "fil"]) {
      expect(flat(read(locale)).sort()).toEqual(english);
    }
  });
  it("every status the order can have, and every error kind, has a sentence", () => {
    const messages = read("en") as { status: Record<string, string>; errors: Record<string, string> };
    for (const key of ["draft", "broadcasting", "awaiting_full_acceptance", "negotiating_substitutes", "cancelled", "other"]) expect(messages.status[key]).toBeTruthy();
    for (const key of ["offerGone", "alreadySelected", "rxRequired", "quoteChanged", "notActionable", "alreadyRecorded", "threadClosed", "contentBlocked", "signedOut", "forbidden", "network", "generic"]) expect(messages.errors[key]).toBeTruthy();
  });
});
