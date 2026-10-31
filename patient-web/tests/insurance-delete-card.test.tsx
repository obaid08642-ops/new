import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { DeletePolicyAction } from "@/components-next/insurance/delete-policy-action";

const KEYS = ["deletePolicy", "deleteTitle", "deleteBody", "deleteCancel", "deleting", "deleteDone", "deleteFailed"];

describe("delete the insurance card (QA I-03)", () => {
  it("draws the delete action and keeps the confirm dialog closed until it is pressed", () => {
    const html = renderToStaticMarkup(<DeletePolicyAction />);
    expect(html).toContain("Delete card");
    expect(html).not.toContain("role=\"dialog\"");
    expect(html).not.toContain("This card will be removed from your account.");
  });
  it("has the confirm, busy, success and error texts in all six languages", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const ns = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { InsuranceWeb: Record<string, string> }).InsuranceWeb;
      for (const key of KEYS) expect(ns[key]?.trim(), `${locale}.${key}`).toBeTruthy();
    }
  });
});
