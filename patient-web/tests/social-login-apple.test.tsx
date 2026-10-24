import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { SocialLoginButtons } from "../components-next/social-login-buttons";

describe("web social sign-in buttons", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("draws Apple only when the Services ID is configured, and never X or Snapchat", () => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_CLIENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect(renderToStaticMarkup(<SocialLoginButtons locale="en" />)).not.toContain(">Apple<");
    vi.stubEnv("NEXT_PUBLIC_APPLE_CLIENT_ID", "plus.nabd.web");
    const html = renderToStaticMarkup(<SocialLoginButtons locale="en" />);
    expect(html).toContain(">Apple<");
    expect(html).not.toContain(">Google<");
    expect(html).not.toMatch(/Snapchat|>X</);
  });

  it("draws both Apple and Google when both are configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_CLIENT_ID", "plus.nabd.web");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "g-client");
    const html = renderToStaticMarkup(<SocialLoginButtons locale="en" />);
    expect(html).toContain(">Apple<");
    expect(html).toContain(">Google<");
  });
});
