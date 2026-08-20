import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web manifest", () => {
  it("contains only public identity and a locale start route", () => {
    const data = manifest();

    expect(data.name).toBe("Nabd Plus");
    expect(data.start_url).toBe("/");
    expect(data.icons).toEqual([{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]);
    expect(data.shortcuts).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(/accessToken|refreshToken|appointmentId|prescriptionId/i);
  });
});
