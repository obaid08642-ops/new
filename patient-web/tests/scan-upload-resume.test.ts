import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P15.4 — an interrupted prescription upload resumes as the SAME logical
 * upload, not a duplicate: both idempotency keys are minted once per chosen
 * photo (a ref, reset on new photo and on success) and reused when the user
 * retries after a failure.
 *
 * Pinned by source assertions — the same technique login-form.test.tsx uses —
 * because the behavior (key reuse across user-initiated retries) only differs
 * from the old behavior (a fresh key per attempt) in the key lifecycle, which
 * static markup cannot observe.
 */

describe("P15.4 — upload resume without duplication", () => {
  const source = readFileSync(resolve(process.cwd(), "components-next/scan-prescription-form.tsx"), "utf8");

  it("mints the OCR and save keys once per photo, not once per attempt", () => {
    expect(source).toContain("submitKeys");
    expect(source).toMatch(/submitKeys\.current \?\?= \{ ocr: crypto\.randomUUID\(\), save: crypto\.randomUUID\(\) \}/);
  });

  it("never mints a fresh key inline in a request header", () => {
    expect(source).not.toContain('"idempotency-key": crypto.randomUUID()');
  });

  it("resets the keys for a new photo and after success", () => {
    const resets = source.match(/submitKeys\.current = null/g) ?? [];
    // Once when a new photo is chosen, once on success.
    expect(resets).toHaveLength(2);
  });
});
