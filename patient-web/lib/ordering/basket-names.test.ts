import { describe, expect, it } from "vitest";
import { addLine, cleanNames, emptyBasket, parseBasket, serializeBasket } from "./basket";
import { pickLineName } from "./format";

// Issue 1832: a basket line keeps its names in every website language; the Arabic and English names stay the fallback.
describe("basket line names (issue 1832)", () => {
  const line = { id: "t1", nameAr: "تحليل", nameEn: "CBC", names: { ur: "سی بی سی", hi: "सीबीसी", bn: "সিবিসি", fil: "CBC (Filipino)" } };

  it("a line stores its names in every language", () => {
    const b = addLine(emptyBasket(), "lab", line);
    expect(b.lab[0].names).toEqual(line.names);
  });

  it("the page's own language is read from the line", () => {
    const b = addLine(emptyBasket(), "lab", line);
    expect(pickLineName("hi", b.lab[0])).toBe("सीबीसी");
    expect(pickLineName("bn", b.lab[0])).toBe("সিবিসি");
    expect(pickLineName("fil", b.lab[0])).toBe("CBC (Filipino)");
  });

  it("a language the line has no name for falls back to Arabic/English as before", () => {
    const b = addLine(emptyBasket(), "lab", { id: "t2", nameAr: "تحليل", nameEn: "CBC" });
    expect(pickLineName("ur", b.lab[0])).toBe("تحليل");
    expect(pickLineName("hi", b.lab[0])).toBe("CBC");
    expect(pickLineName("en", b.lab[0])).toBe("CBC");
  });

  it("a stored basket from before this change still reads", () => {
    const old = JSON.stringify({ lab: [{ id: "t3", nameAr: "تحليل", nameEn: "CBC" }], radiology: [], nursing: [] });
    const b = parseBasket(old);
    expect(b.lab[0].names).toBeUndefined();
    expect(pickLineName("en", b.lab[0])).toBe("CBC");
  });

  it("keeps only non-empty string names of the known languages", () => {
    expect(cleanNames({ ur: " ", hi: 5, bn: "বাংলা", fil: "Test", en: "English" })).toEqual({ bn: "বাংলা", fil: "Test" });
    expect(cleanNames("not an object")).toBeUndefined();
    const b = parseBasket(serializeBasket({ ...emptyBasket(), lab: [{ id: "t4", names: { hi: "नाम", ur: 7 } } as never] }));
    expect(b.lab[0].names).toEqual({ hi: "नाम" });
  });
});
