import { describe, expect, it } from "vitest";
import { originalOf } from "./image-fallback";

describe("originalOf", () => {
  it("gives the CDN original of a failed optimizer URL", () => {
    expect(originalOf("/_next/image?url=https%3A%2F%2Fcdn.nabd.plus%2F202546_1.webp&w=256&q=75")).toBe("https://cdn.nabd.plus/202546_1.webp");
    expect(originalOf("https://nabd.plus/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fx%2Fa.jpg&w=64")).toBe("https://res.cloudinary.com/x/a.jpg");
  });
  it("ignores everything else, and hosts that are not allowed", () => {
    expect(originalOf("https://cdn.nabd.plus/a.webp")).toBeNull();
    expect(originalOf("/_next/image?url=https%3A%2F%2Fevil.example%2Fa.png&w=64")).toBeNull();
    expect(originalOf("/_next/image?url=%2Flocal.png&w=64")).toBeNull();
    expect(originalOf("/_next/image?w=64")).toBeNull();
    expect(originalOf("")).toBeNull();
    expect(originalOf(null)).toBeNull();
  });
});
