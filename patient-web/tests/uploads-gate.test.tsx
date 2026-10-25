import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { UploadsGate, UploadsProvider } from "@/components-next/uploads/uploads-provider";

const messages = { Shared: { uploadsUnavailable: "Uploads are off" } };
const html = (enabled: boolean | undefined) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      {enabled === undefined ? <UploadsGate><button>pick a file</button></UploadsGate> : <UploadsProvider enabled={enabled}><UploadsGate><button>pick a file</button></UploadsGate></UploadsProvider>}
    </NextIntlClientProvider>,
  );

describe("uploads gate", () => {
  it("shows the upload control while uploads are on", () => {
    expect(html(true)).toContain("pick a file");
  });
  it("shows the notice instead of the control when the backend says uploads are off", () => {
    const out = html(false);
    expect(out).not.toContain("pick a file");
    expect(out).toContain("Uploads are off");
    expect(out).toContain('role="status"');
  });
  it("fails open without a provider", () => {
    expect(html(undefined)).toContain("pick a file");
  });
});
