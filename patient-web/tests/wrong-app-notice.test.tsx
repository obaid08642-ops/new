import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
import { WrongAppNotice } from "@/components-next/auth/wrong-app-notice";

afterEach(() => vi.unstubAllEnvs());

describe("WrongAppNotice", () => {
  it("explains and offers the way back; no link when nothing is configured", () => {
    const html = renderToStaticMarkup(<WrongAppNotice onBack={() => {}} />);
    expect(html).toContain("wrongAppTitle");
    expect(html).toContain("wrongAppBack");
    expect(html).not.toContain("<a ");
  });
  it("shows the configured https links", () => {
    vi.stubEnv("NEXT_PUBLIC_PROVIDER_WEB_URL", "https://provider.example/");
    const html = renderToStaticMarkup(<WrongAppNotice onBack={() => {}} />);
    expect(html).toContain('href="https://provider.example/"');
    expect(html).toContain("wrongAppWeb");
  });
});
