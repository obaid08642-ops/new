// ACCEPTANCE — D-38 legal texts live in the apps (owner decision 2026-10-08 item 36; Queue C D-38), web part.
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
// Run: npx vitest run --config vitest.acceptance.config.ts acceptance/d-38
//
// Required (source checks; the backend part is backend/acceptance/d-38):
//   1. The hard-coded legal arrays in components-next/legal-terms.tsx are gone (or the file is removed).
//   2. Pages /terms, /privacy, /refund-policy and /telehealth-consent exist under app/[locale]/, and each
//      reads its text from the server: the page or a module it imports calls `/legal/policy/<key>` with
//      `lang` (keys: patient_terms, privacy_policy, refund_policy, telehealth_consent).
//   3. Nothing renders the server text as raw HTML (no dangerouslySetInnerHTML on those pages).
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const PAGES: Array<[string, string]> = [["terms", "patient_terms"], ["privacy", "privacy_policy"], ["refund-policy", "refund_policy"], ["telehealth-consent", "telehealth_consent"]];

/** The page source plus every local module it imports (two levels), so a shared loader counts. */
function sourceTree(file: string, depth = 2, seen = new Set<string>()): string {
  if (seen.has(file) || !existsSync(file)) return "";
  seen.add(file);
  const src = readFileSync(file, "utf8");
  if (depth === 0) return src;
  const out = [src];
  for (const m of src.matchAll(/from\s+["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/g)) {
    const spec = m[1];
    const base = spec.startsWith("@/") ? resolve(ROOT, spec.slice(2)) : resolve(dirname(file), spec);
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      if (existsSync(base + ext) && !base.endsWith(".css")) { out.push(sourceTree(base + ext, depth - 1, seen)); break; }
    }
  }
  return out.join("\n");
}

describe("D-38 web: legal texts come from /legal/policy", () => {
  it("the hard-coded legal arrays are removed", () => {
    const f = resolve(ROOT, "components-next/legal-terms.tsx");
    const src = existsSync(f) ? readFileSync(f, "utf8") : "";
    expect(src).not.toMatch(/const\s+(AR|EN)_(TERMS|PRIVACY)\s*=/);
  });

  for (const [route, key] of PAGES) {
    it(`/${route} reads ${key} from /legal/policy with the page language`, () => {
      const page = resolve(ROOT, `app/[locale]/${route}/page.tsx`);
      expect(existsSync(page)).toBe(true);
      const tree = sourceTree(page);
      expect(tree).toMatch(/\/legal\/policy\//);
      expect(tree).toContain(key);
      expect(tree).toMatch(/lang/);
      expect(readFileSync(page, "utf8")).not.toMatch(/dangerouslySetInnerHTML/);
    });
  }
});
