// Owner review G4, lead reviewer round: A category illustrations, B chips + infinite list + most requested, C Order now skips the cart,
// D every lab with its own price in the lab-choice step.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  DIAG_ART, DIAG_ART_FALLBACK, DIAG_ART_KEYS, DIAG_ART_TONE, LAB_ART_KEYS, RAD_ART_KEYS, diagArtKey, diagArtKeysOf, filterByArt, isMachineValue, itemSubtitle, mostRequested, parseDiagArt,
} from "@/components-next/ui-generated/icons/diag-art";
import { SERVICE_TONES } from "@/components-next/ui-generated/icons/fill";
import { DiagArt } from "@/components-next/diagnostics/diag-art";
import { addLine, emptyBasket, parseBasket, serializeBasket } from "@/lib/ordering/basket";
import { contextQuery } from "@/lib/ordering/context";
import { providerPriceList, type ProviderRow } from "@/lib/ordering/quote";
import { orderLines, parseSingle, parseSingleItem, serializeSingle, withItem } from "@/lib/ordering/single";

const code = (file: string) => readFileSync(file, "utf8");

describe("A: one illustration per category", () => {
  it("has art, a service tone and shapes for every category, none with a raw colour", () => {
    expect(DIAG_ART_KEYS).toHaveLength(12);
    for (const key of DIAG_ART_KEYS) {
      expect(DIAG_ART[key].length).toBeGreaterThan(1);
      expect(SERVICE_TONES).toContain(DIAG_ART_TONE[key]);
      for (const shape of DIAG_ART[key]) expect(JSON.stringify(shape)).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb/);
    }
    expect(code("../packages/ui/icons/diag-art.ts")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it("maps lab tests by name, category and sample type", () => {
    const lab = (names: string[], category?: string, sampleType?: string) => diagArtKey({ kind: "lab", names, category, sampleType });
    expect(lab(["Fasting blood glucose"], "Biochemistry", "blood")).toBe("sugar");
    expect(lab(["HbA1c"])).toBe("sugar");
    expect(lab(["سكر صائم"])).toBe("sugar");
    expect(lab(["TSH"], "Hormones")).toBe("hormones");
    expect(lab(["الغدة الدرقية"])).toBe("hormones");
    expect(lab(["Vitamin D 25-OH"], "Vitamins", "blood")).toBe("vitamins");
    expect(lab(["فيتامين ب12"])).toBe("vitamins");
    expect(lab(["Liver function (ALT, AST)"])).toBe("liver");
    expect(lab(["كرياتينين"])).toBe("liver");
    expect(lab(["Urine analysis"], undefined, "urine")).toBe("urine");
    expect(lab(["Stool culture"])).toBe("urine");
    expect(lab(["Complete blood count (CBC)"], undefined, "blood")).toBe("blood");
    expect(lab(["Culture"], undefined, "urine")).toBe("urine");
  });
  it("maps scans by modality first, then by name", () => {
    const scan = (modality: string | undefined, names: string[] = []) => diagArtKey({ kind: "radiology", modality, names });
    expect(scan("MRI")).toBe("mri");
    expect(scan("ct")).toBe("ct");
    expect(scan("Ultrasound")).toBe("ultrasound");
    expect(scan("x-ray")).toBe("xray");
    expect(scan(undefined, ["Screening mammogram"])).toBe("mammography");
    expect(scan(undefined, ["أشعة بالموجات فوق الصوتية"])).toBe("ultrasound");
    expect(scan(undefined, ["تخطيط القلب"])).toBe("ecg");
    expect(scan("Echo")).toBe("ecg");
    // the modality wins over a heart word in the name
    expect(scan("CT", ["Cardiac CT"])).toBe("ct");
  });
  it("falls back to a sensible category of the right kind and never mixes kinds", () => {
    expect(diagArtKey({ kind: "lab" })).toBe(DIAG_ART_FALLBACK.lab);
    expect(diagArtKey({ kind: "radiology", names: ["???"] })).toBe(DIAG_ART_FALLBACK.radiology);
    expect(LAB_ART_KEYS).toContain(DIAG_ART_FALLBACK.lab);
    expect(RAD_ART_KEYS).toContain(DIAG_ART_FALLBACK.radiology);
    expect(LAB_ART_KEYS as readonly string[]).toContain(diagArtKey({ kind: "lab", names: ["unknown thing"] }));
    expect(RAD_ART_KEYS as readonly string[]).toContain(diagArtKey({ kind: "radiology", modality: "weird" }));
  });
  it("draws roles as classes: no style attribute, no colour value, decorative", () => {
    for (const key of DIAG_ART_KEYS) {
      const html = renderToStaticMarkup(createElement(DiagArt, { art: key }));
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain(`nabd-tone--${DIAG_ART_TONE[key]}`);
      expect(html).not.toMatch(/style=|#[0-9a-fA-F]{3,8}\b|rgb\(/);
    }
    expect(code("components-next/diagnostics/diag-art.module.css")).toContain("var(--nabd-tone-fg)");
  });
  it("uses the item's own photo only when the backend sends one", () => {
    const card = code("components-next/diagnostics/item-card.tsx");
    expect(card).toContain("allowedImageUrl(imageUrl)");
    expect(card).toContain("image ? <PhotoWithFallback");
    expect(card).toContain("fallback={picture}");
  });
});

describe("B: chips filter, search stays, most requested, infinite window", () => {
  const rows = [
    { id: "a", art: "blood" as const, popularity: 2 },
    { id: "b", art: "sugar" as const, popularity: 9 },
    { id: "c", art: "blood" as const },
    { id: "d", art: "sugar" as const, popularity: 9 },
  ];
  it("filters by the mapped category, 'all' keeps everything in order", () => {
    expect(filterByArt(rows, "blood").map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterByArt(rows, "all").map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(filterByArt(rows, null)).toHaveLength(4);
    expect(filterByArt(rows, "xray")).toEqual([]);
  });
  it("reads the chip from the URL for the right kind only", () => {
    expect(parseDiagArt("sugar", "lab")).toBe("sugar");
    expect(parseDiagArt("mri", "lab")).toBe("all");
    expect(parseDiagArt("mri", "radiology")).toBe("mri");
    expect(parseDiagArt("zzz", "radiology")).toBe("all");
    expect(diagArtKeysOf("lab")).toEqual(LAB_ART_KEYS);
    expect(diagArtKeysOf("radiology")).toEqual(RAD_ART_KEYS);
  });
  it("most requested = the backend's popularity, highest first, ties in catalogue order, at most N", () => {
    expect(mostRequested(rows, 3).map((r) => r.id)).toEqual(["b", "d", "a"]);
    expect(mostRequested(rows, 2)).toHaveLength(2);
    expect(mostRequested([], 6)).toEqual([]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c", "d"]); // the input is not reordered
  });
  it("the page wires chips, search, the strip and the island", () => {
    const hub = code("app/[locale]/diagnostics/page.tsx");
    expect(hub).toContain("limit: MOST_REQUESTED"); // the strip is the first six in the server\u0027s popularity order
    expect(hub).toContain("wantsTests && !filter.q ?"); // the strip is for the unfiltered hub
    expect(hub).toContain('t("allTestsTitle")');
    expect(hub).toContain('t("allScansTitle")');
    const island = code("components-next/diagnostics/item-catalog.tsx");
    expect(island).toContain("IntersectionObserver");
    expect(island).toContain("<ShowMore"); // the no-script step stays a link
  });
});

describe("C: Order now skips the cart", () => {
  it("reads item= safely", () => {
    expect(parseSingleItem("abc123")).toBe("abc123");
    expect(parseSingleItem(["x1", "y"])).toBe("x1");
    expect(parseSingleItem("a b")).toBeUndefined();
    expect(parseSingleItem("../x")).toBeUndefined();
    expect(parseSingleItem(undefined)).toBeUndefined();
    expect(parseSingleItem("")).toBeUndefined();
  });
  it("adds item= to a URL and carries it through the steps", () => {
    expect(withItem("/ar/labs/basket", "t1")).toBe("/ar/labs/basket?item=t1");
    expect(withItem("/ar/labs/basket?place=facility", "t1")).toBe("/ar/labs/basket?place=facility&item=t1");
    expect(withItem("/ar/labs/basket", undefined)).toBe("/ar/labs/basket");
    expect(contextQuery({ kind: "radiology", place: "facility", pay: "insurance", item: "s9" })).toBe("?kind=radiology&place=facility&pay=insurance&item=s9");
    expect(contextQuery({ place: "home", pay: "cash" })).toBe("");
  });
  it("works on that one item and never reads or changes the basket", () => {
    let basket = addLine(emptyBasket(), "lab", { id: "in-cart", nameEn: "In cart" });
    const before = serializeBasket(basket);
    const lines = orderLines(basket.lab, "t1", { id: "t1", nameEn: "One test" });
    expect(lines).toEqual([{ id: "t1", nameEn: "One test" }]);
    expect(orderLines(basket.lab, "t1", null)).toEqual([{ id: "t1" }]);
    expect(orderLines(basket.lab, "t1", { id: "other" })).toEqual([{ id: "t1" }]); // a stale remembered line of another item is ignored
    expect(serializeBasket(basket)).toBe(before);
    expect(parseBasket(before).lab.map((l) => l.id)).toEqual(["in-cart"]);
    // without item= the cart checkout is as before
    expect(orderLines(basket.lab, undefined)).toBe(basket.lab);
    basket = addLine(basket, "lab", { id: "t1" });
    expect(orderLines(basket.lab, undefined).map((l) => l.id)).toEqual(["in-cart", "t1"]);
  });
  it("remembers the item's names for this tab only", () => {
    const raw = serializeSingle({ id: "t1", nameAr: "تحليل", nameEn: "CBC", names: { ur: "سی بی سی" } });
    expect(parseSingle(raw, "t1")).toEqual({ id: "t1", nameAr: "تحليل", nameEn: "CBC", names: { ur: "سی بی سی" } });
    expect(parseSingle(raw, "t2")).toBeNull();
    expect(parseSingle("{bad", "t1")).toBeNull();
    expect(parseSingle(null, "t1")).toBeNull();
  });
  it("the Order now button goes to the steps with item= and does not add to the cart; the steps carry it and keep the cart after paying", () => {
    const actions = code("components-next/ordering/add-to-basket.tsx");
    const onOrder = actions.slice(actions.indexOf('label={t("orderNow")}'));
    expect(onOrder).toContain("router.push(withItem(orderHref, line.id))");
    expect(onOrder).not.toContain("add(kind, line)");
    for (const file of ["basket-client", "providers-client", "when-client", "confirm-client"]) expect(code(`components-next/ordering/${file}.tsx`)).toContain("item }");
    expect(code("components-next/ordering/use-order-lines.ts")).toContain("single ? keepBasket : remove");
    for (const page of ["basket", "providers", "when", "confirm"]) expect(code(`app/[locale]/labs/${page}/page.tsx`)).toContain("parseSingleItem(query.item)");
  });
});

describe("D: the lab-choice step lists every lab with its own price", () => {
  const row = (providerId: string, total: number, extra: Partial<ProviderRow> = {}): ProviderRow => ({ providerId, nameAr: null, nameEn: providerId, total, distanceKm: null, rating: null, inNetwork: false, earliestAt: null, turnaroundHours: null, coversAll: true, missing: [], ...extra });
  const best = { ...row("b", 80), lines: [{ catalogId: "t1", price: 70 }], estimatedInsuranceShare: 0, patientShare: 80, estimatedPatientShare: null };
  const compare = [row("a", 90), row("b", 80), row("c", 60, { coversAll: false, missing: ["t1"] }), row("d", 120, { inNetwork: true })];
  it("best first with its total, then every other lab with its own total, none dropped", () => {
    const list = providerPriceList({ bestMatch: best, compare });
    expect(list.map((x) => [x.row.providerId, x.row.total, x.best])).toEqual([["b", 80, true], ["a", 90, false], ["c", 60, false], ["d", 120, false]]);
  });
  it("keeps labs that lack an item (they are shown, not chosen) and honours the in-network filter", () => {
    expect(providerPriceList({ bestMatch: best, compare }).find((x) => x.row.providerId === "c")?.row.coversAll).toBe(false);
    expect(providerPriceList({ bestMatch: null, compare }, { inNetworkOnly: true }).map((x) => x.row.providerId)).toEqual(["d"]);
    expect(providerPriceList({ bestMatch: null, compare: [] })).toEqual([]);
  });
  it("the step draws the price of each row", () => {
    const step = code("components-next/ordering/providers-client.tsx");
    expect(step).toContain("providerPriceList(g, { inNetworkOnly })");
    expect(step).toContain("moneyText(locale, r.total)");
  });
});

describe("new keys in all six languages", () => {
  const web = ["mostRequested", "allTestsTitle", "allScansTitle", "catLabel", "catAll", "catBlood", "catHormones", "catVitamins", "catSugar", "catUrine", "catLiver", "catXray", "catCt", "catMri", "catUltrasound", "catMammography", "catEcg"];
  const en = JSON.parse(code("messages/en.json"));
  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s", (loc) => {
    const m = JSON.parse(code(`messages/${loc}.json`));
    for (const key of web) {
      expect(String(m.DiagWeb[key] ?? "").trim(), key).not.toBe("");
      if (loc !== "en" && !/^(CT|MRI|X-ray|Ultrasound|Mammography|Hormones)$/.test(en.DiagWeb[key])) expect(m.DiagWeb[key], `${loc}.${key}`).not.toBe(en.DiagWeb[key]);
    }
    expect(String(m.OrderingFlow.singleNote ?? "").trim()).not.toBe("");
    if (loc !== "en") expect(m.OrderingFlow.singleNote).not.toBe(en.OrderingFlow.singleNote);
  });
});

describe("card subtitles never show a raw machine value", () => {
  it("shows the description, else the translated category", () => {
    for (const raw of ["xray", "ct", "mri", "ultrasound", "mammography", "ecg"]) {
      expect(isMachineValue(raw)).toBe(true);
      expect(itemSubtitle(raw, [], "Translated")).toBe("Translated");
    }
    expect(itemSubtitle("MRI", ["mri"], "Translated")).toBe("Translated");
    expect(itemSubtitle("Scan of the chest", ["xray"], "Translated")).toBe("Scan of the chest");
    expect(itemSubtitle(undefined, [], "Translated")).toBe("Translated");
  });
  it("the radiology list shows the translated category, not the upper-cased modality", () => {
    const page = code("app/[locale]/diagnostics/radiology/page.tsx");
    expect(page).toContain("CAT_LABEL[diagArtKey(");
    expect(page).not.toContain("service.modality?.toUpperCase()");
  });
});
