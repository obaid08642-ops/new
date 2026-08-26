import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("llms.txt route", () => {
  it("lists only public entry points and explicitly excludes private patient domains", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body).toContain("[Arabic home](/ar)");
    expect(body).toContain("[Filipino home](/fil)");
    expect(body).toContain("Patient records");
    expect(body).not.toContain("accessToken");
  });
});
