import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import fil from "../messages/fil.json";

type Tree = { [key: string]: string | Tree };
const read = (tree: Tree, path: string): string | undefined => {
  let node: string | Tree | undefined = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
};

// Titles and labels of the home, diagnostics, health trends, address and tracking pages that shipped in English in Filipino (issue 1550).
const TITLES = [
  "Home.heroTitle", "Home.nursingTitle", "Home.aiTitle", "Diagnostics.packagesTitle", "Diagnostics.filterCBC",
  "HealthTrends.eyebrow", "Addresses.line1", "Addresses.line2", "HomeVisitTracking.title", "NursingTracking.title",
];

describe("Filipino titles", () => {
  it("has its own text for every title, not the English one", () => {
    const stillEnglish = TITLES.filter((key) => {
      const own = read(fil as Tree, key);
      return !own || own === read(en as Tree, key);
    });
    expect(stillEnglish).toEqual([]);
  });
});
