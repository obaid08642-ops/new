// 17.2: the shared toast is a polite status message that draws nothing when there is no message.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Toast } from "@/components-next/feedback/toast";

describe("Toast", () => {
  it("draws nothing without a message", () => {
    expect(renderToStaticMarkup(<Toast message={null} onDone={() => undefined} />)).toBe("");
  });

  it("announces the message as a polite status", () => {
    const html = renderToStaticMarkup(<Toast message="Saved" onDone={() => undefined} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Saved");
  });
});
