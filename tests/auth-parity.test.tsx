import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }), useSearchParams: () => new URLSearchParams("identifier=patient%40example.com") }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { AuthWelcome } from "../components-next/auth-welcome";
import { RegisterForm } from "../components-next/register-form";
import { OtpScreen } from "../components-next/otp-screen";

describe("Auth screen parity contract", () => {
  it("renders premium Welcome actions without mock credentials or emoji content", () => {
    const html = renderToStaticMarkup(<AuthWelcome locale="en" />);
    expect(html).toContain("Continue as guest");
    expect(html).toContain("Create account");
    expect(html).toContain("Log in");
    expect(html).not.toContain("Sandbox@123");
    expect(html).not.toContain("patient.sandbox@nabd.plus");
    expect(html).not.toMatch(/[😀-🙏]/u);
  });

  it("renders all registration fields and a real submit form", () => {
    const html = renderToStaticMarkup(<RegisterForm locale="en" />);
    expect(html).toContain('autoComplete="name"');
    expect(html).toContain('autoComplete="tel"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain("Terms and Privacy Policy");
    expect(html).not.toContain("Sandbox@123");
  });

  it("renders six OTP cells and does not place a token in markup", () => {
    const html = renderToStaticMarkup(<OtpScreen locale="en" />);
    expect((html.match(/aria-label="Verification code/g) ?? []).length).toBe(6);
    expect(html).toContain("Resend available in");
    expect(html).toContain("Verify code");
    expect(html).not.toMatch(/exchange_token|access_token|Sandbox@123/i);
  });
});
