import { describe, expect, it } from "vitest";
import ar from "../messages/ar.json";
import en from "../messages/en.json";
import { LAB_CATEGORIES, isLabCategory } from "./lab-categories";

describe("lab category labels", () => {
  it("knows the catalogue codes and nothing else", () => {
    expect(isLabCategory("cardiac")).toBe(true);
    expect(isLabCategory("Package")).toBe(true);
    expect(isLabCategory("other")).toBe(false);
    expect(isLabCategory(undefined)).toBe(false);
  });
  it("has a label for every code", () => {
    for (const code of LAB_CATEGORIES) {
      expect(ar.LabsPackages.categoryName[code]).toBeTruthy();
      expect(en.LabsPackages.categoryName[code]).toBeTruthy();
    }
  });
});
