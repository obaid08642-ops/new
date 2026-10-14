import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { boundedUpstreamError } from "../lib/api/error-response";

/**
 * Phase 13, task 13.R5 — the client half of the error-code contract.
 *
 * `boundedUpstreamError` is the single passthrough every server component uses to forward
 * a backend failure (111 call sites). It only forwards a `code` when the value matches
 * `/^[A-Z0-9_.-]{1,80}$/`, so the code silently vanishes and the client is left with a bare
 * message it cannot branch on.
 *
 * That is not hypothetical: the catalog shipped from 13.R5 originally used lowercase codes
 * (`not_found`, `bad_request`), which this filter rejected, so none of them reached the UI.
 * The catalog now follows the backend's established UPPER_SNAKE convention
 * (`AUTHENTICATION_REQUIRED`, `DUPLICATE_TRANSACTION`, ...), and this contract test is what
 * stops that from silently regressing again.
 */
const CATALOG = readFileSync(
  resolve(process.cwd(), "../backend/src/common/error-catalog.ts"),
  "utf8",
);

/**
 * `NextResponse.json()` does not expose a readable `_body` synchronously, so the body has
 * to be awaited. Reading `_body` returns "" and silently makes every assertion below
 * vacuous, which is exactly what the first version of this file did.
 */
async function bodyOf(response: unknown): Promise<string> {
  return String(await (response as Response).text());
}

/** Pull the published code identifiers straight out of the backend source. */
function publishedCodes(): string[] {
  return [...CATALOG.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*\{ status:/gm)].map((m) => m[1]);
}

describe("backend error codes reach the client", () => {
  it("finds the catalogued codes in the backend source", () => {
    expect(publishedCodes().length).toBeGreaterThan(0);
    expect(publishedCodes()).toContain("NOT_FOUND");
  });

  it("forwards every catalogued code through boundedUpstreamError", async () => {
    const dropped: string[] = [];
    for (const code of publishedCodes()) {
      const body = await bodyOf(boundedUpstreamError({ code, message: "x" }, "fallback", 400));
      if (!body.includes(code)) dropped.push(code);
    }
    expect(dropped).toEqual([]);
  });

  it("matches the convention the rest of the backend already uses", async () => {
    const legacy = ["AUTHENTICATION_REQUIRED", "DUPLICATE_TRANSACTION", "CONCURRENT_SLOT_CONFLICT"];
    for (const code of legacy) {
      expect(await bodyOf(boundedUpstreamError({ code }, "fallback", 400))).toContain(code);
    }
    expect(publishedCodes().every((c) => /^[A-Z][A-Z0-9_]*$/.test(c))).toBe(true);
  });

  it("still refuses a code that is not a well-formed identifier", async () => {
    const body = await bodyOf(boundedUpstreamError({ code: "bad code with spaces" }, "fallback", 400));
    expect(body).not.toContain("bad code with spaces");
    expect(body).toContain("fallback");
  });

  it("does not forward a code that is absurdly long", async () => {
    const body = await bodyOf(boundedUpstreamError({ code: "A".repeat(200) }, "fallback", 400));
    expect(body).not.toContain("A".repeat(200));
    expect(body).toContain("fallback");
  });

  it("actually reads a body, so the assertions above cannot pass vacuously", async () => {
    // Guards the guard: if this ever returns "", every other test in this file is a no-op.
    expect(await bodyOf(boundedUpstreamError({ code: "NOT_FOUND", message: "x" }, "f", 404))).toContain(
      "NOT_FOUND",
    );
  });
});