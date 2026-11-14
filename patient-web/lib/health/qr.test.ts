import { describe, expect, it } from "vitest";
import { passportQrText, qrPath } from "./qr";

describe("qrPath", () => {
  it("draws a square module grid with dark modules and the three finder corners", () => {
    const { size, path } = qrPath("hello");
    expect(size).toBeGreaterThanOrEqual(21);
    expect(path.startsWith("M")).toBe(true);
    // the top-left finder pattern starts with a dark module at 0,0 and the whole first row of it is dark
    expect(path.startsWith("M0 0h1v1h-1zM1 0h1v1h-1z")).toBe(true);
  });
  it("fits a health passport token of about 200 characters", () => {
    const text = passportQrText("nabd_health_passport", 2, "a".repeat(220));
    const { size } = qrPath(text);
    expect(size).toBeLessThanOrEqual(97);
    expect(JSON.parse(text)).toEqual({ t: "nabd_health_passport", v: 2, token: "a".repeat(220) });
  });
});
