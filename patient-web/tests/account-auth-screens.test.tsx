import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
// the real en messages through the real ICU translator, so a missing key or a bad message fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});

import { AuthWelcome } from "@/components-next/auth-welcome";
import { PasswordResetForm } from "@/components-next/password-reset-form";
import { RegisterForm } from "@/components-next/register-form";
import { SessionList } from "@/components-next/settings/session-list";

describe("account and sign-in screens", () => {
  it("Welcome draws no guest error before a guest start fails", () => {
    const html = renderToStaticMarkup(<AuthWelcome locale="en" />);
    expect(html).toContain("Continue as guest");
    expect(html).not.toContain("Could not start as a guest");
  });

  it("the reset form has the show/hide eye on the password fields and the code field", () => {
    const html = renderToStaticMarkup(<PasswordResetForm locale="en" />);
    expect(html).toContain("Show password");
    expect(html).toContain("Confirm password");
  });

  it("the register form asks for the password twice", () => {
    const html = renderToStaticMarkup(<RegisterForm locale="en" />);
    expect(html).toContain("Confirm password");
    expect(html).toContain("At least 10 characters");
  });

  it("the session list marks this device and asks nothing until a session is ended", () => {
    const html = renderToStaticMarkup(<SessionList sessions={[
      { id: "a1", label: "Chrome", platform: "Windows", ip: "10.0.*.*", current: true, expiresInSeconds: 86400 },
      { id: "b2", label: "Safari", platform: "iOS" },
    ]} />);
    expect(html).toContain("This device");
    expect(html).toContain("Chrome · Windows");
    expect(html).not.toContain("Confirm sign-out");
  });
});
