import { describe, expect, it } from "vitest";
import { isHttpsCheckoutUrl } from "./checkout-url";

describe("isHttpsCheckoutUrl", () => {
  it("accepts only syntactically valid HTTPS gateway redirects", () => {
    expect(isHttpsCheckoutUrl("https://gateway.example/checkout")).toBe(true);
    expect(isHttpsCheckoutUrl("http://gateway.example/checkout")).toBe(false);
    expect(isHttpsCheckoutUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsCheckoutUrl("not-a-url")).toBe(false);
  });
});
