// a556e62 (REVIEW_P13 13.R15): every article page showed a static "Pending
// human review — verify with a clinician" badge (false on published,
// reviewed articles) and developer text such as "the backend did not return
// a reviewer name". The page states only what the article record carries.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(__dirname, "../app/[locale]/articles/[slug]/page.tsx"), "utf8");

describe("a556e62: article page makes no unbacked review claim", () => {
  it("no static pending-review badge", () => {
    expect(src).not.toMatch(/Pending human review|بانتظار المراجعة البشرية/);
  });
  it("no developer text shown to readers", () => {
    expect(src).not.toMatch(/backend did not return|No author was returned|No reference list was returned|لم يُرجع الخادم|لم يُرجعها الخادم/);
  });
  it("keeps the general medical disclaimer", () => {
    expect(src).toMatch(/لا يغني عن استشارة الطبيب/);
  });
});
