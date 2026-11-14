// 17.1: the phone menu starts closed: one button that says what it does, and no list until it is opened.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/en" }));
const { PhoneMenu } = await import("@/components-next/core/phone-menu");

describe("PhoneMenu", () => {
  it("starts closed: a disclosure button with its state, and no links drawn", () => {
    const html = renderToStaticMarkup(
      <PhoneMenu labels={{ open: "Menu", close: "Close menu" }} items={[{ label: "My orders", href: "/en/orders" }]} />,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('aria-controls="');
    expect(html).not.toContain("My orders");
  });
});
