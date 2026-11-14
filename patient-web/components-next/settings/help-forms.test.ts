import { describe, expect, it } from "vitest";
import { ratingOf } from "./help-forms";

describe("ratingOf", () => {
  it("turns the stars into the three ratings the server knows", () => {
    expect(ratingOf(0)).toBeUndefined();
    expect(ratingOf(1)).toBe("negative");
    expect(ratingOf(2)).toBe("negative");
    expect(ratingOf(3)).toBe("neutral");
    expect(ratingOf(4)).toBe("positive");
    expect(ratingOf(5)).toBe("positive");
  });
});
