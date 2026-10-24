import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ur from "../messages/ur.json";
import hi from "../messages/hi.json";
import bn from "../messages/bn.json";
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

// Sentences of the map, clinic, laboratory and nurse detail pages that shipped in English in four languages (issue 1550).
const SENTENCES = [
  "MapExplorer.subtitle", "MapExplorer.searchPh", "MapExplorer.filterDoctors", "MapExplorer.noProviders",
  "Clinics.subtitle", "Clinics.unavailableTitle", "Clinics.unavailableBody", "Clinics.typeLabel", "Clinics.defaultAbout",
  "LabsDetail.subtitle", "LabsDetail.unavailableTitle", "LabsDetail.unavailableBody", "LabsDetail.homeVisitSupported", "LabsDetail.defaultAbout",
  "NurseDetail.subtitle", "NurseDetail.unavailableTitle", "NurseDetail.unavailableBody", "NurseDetail.verified", "NurseDetail.defaultBio",
  "NurseDetail.servicesTitle", "NurseDetail.requestNurse",
];

describe("facility, laboratory and nurse page messages", () => {
  for (const [locale, messages] of Object.entries({ ur, hi, bn, fil })) {
    it(`${locale} has its own text for every sentence, not the English one`, () => {
      const stillEnglish = SENTENCES.filter((key) => {
        const own = read(messages as Tree, key);
        return !own || own === read(en as Tree, key);
      });
      expect(stillEnglish).toEqual([]);
    });
  }
});
