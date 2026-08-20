import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("favicon route", () => {
  it("serves the Nabd Plus vector mark with safe cache and content-type headers", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toContain("viewBox=\"0 0 64 64\"");
  });
});
