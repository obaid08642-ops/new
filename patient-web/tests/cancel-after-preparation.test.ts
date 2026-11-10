import { describe, expect, it } from "vitest";
import { classifyError, errorCode } from "@/components-next/pharmacy-offers/use-pharmacy-action";
import en from "../messages/en.json";

describe("a pharmacy order that is already being prepared (owner decision 4)", () => {
  it("shows its own message when the server refuses the cancel", () => {
    const kind = classifyError(400, errorCode({ message: "cancel_not_allowed_after_preparation" }));
    expect(kind).toBe("cancelAfterPreparation");
    expect(en.PharmacyOffers.errors[kind as "cancelAfterPreparation"]).toContain("can no longer be cancelled");
  });
});
