import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PassportQr } from "./passport-qr";

describe("PassportQr", () => {
  it("is an image with the page's label and the code drawn as a path, no raw colours", () => {
    const html = renderToStaticMarkup(<PassportQr text='{"t":"nabd_health_passport","v":2,"token":"abc"}' label="QR code of your health ID" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="QR code of your health ID"');
    expect(html).toMatch(/<path[^>]* d="M0 0h1v1h-1z/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb\(/);
  });
});
