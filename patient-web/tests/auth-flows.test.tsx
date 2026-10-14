import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "./helpers/intl";

let activeLocale = "en";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }), usePathname: () => "/en/login" }));
vi.mock("next-intl", async () => {
  const helpers = await import("./helpers/intl");
  return { useTranslations: (namespace?: string) => helpers.createTranslator(activeLocale, namespace), useLocale: () => activeLocale };
});

import { LoginForm, loginErrorMessage } from "../components-next/login-form";
import { RegisterForm, registerErrorMessage } from "../components-next/register-form";
import { OtpScreen, resendErrorMessage, verifyErrorMessage } from "../components-next/otp-screen";
import { ForgotPasswordForm, forgotErrorMessage } from "../components-next/forgot-password-form";
import { PasswordResetForm, resetErrorMessage } from "../components-next/password-reset-form";
import { AuthWelcome } from "../components-next/auth-welcome";
import { OnboardingCarousel } from "../components-next/onboarding-carousel";
import { OnboardingPermissionsClient } from "../components-next/onboarding-permissions-client";
import { ThemeToggle } from "../components-next/theme-toggle";
import { SERVICE_ICONS } from "../components-next/ui-generated/icons/fill";
import { locales, type Locale } from "../lib/i18n";

const LATIN_ONLY_WORDS = /\b(Forgot password\?|Show password|Hide password|Or continue with|Create an account|Continue as guest|Resend code|Verify code|Skip|Get started)\b/;

function inLocale<T>(locale: Locale, render: () => T): T {
  activeLocale = locale;
  try { return render(); } finally { activeLocale = "en"; }
}

describe("login error messages follow the HTTP status, not 'wrong details' for everything", () => {
  const t = createTranslator("en", "Login");
  it("maps each status to its own message", () => {
    expect(loginErrorMessage(t, 401, false)).toBe(t("invalid"));
    expect(loginErrorMessage(t, 400, false)).toBe(t("checkDetails"));
    expect(loginErrorMessage(t, 403, false)).toBe(t("forbidden"));
    expect(loginErrorMessage(t, 429, false)).toBe(t("rateLimited"));
    expect(loginErrorMessage(t, 502, false)).toBe(t("serverError"));
    expect(loginErrorMessage(t, 503, false)).toBe(t("unavailable"));
    expect(loginErrorMessage(t, 504, false)).toBe(t("unavailable"));
  });
  it("keeps the two-factor wording for the code step and never calls a throttle a wrong code", () => {
    expect(loginErrorMessage(t, 401, true)).toBe(t("twoFactorInvalid"));
    expect(loginErrorMessage(t, 503, true)).toBe(t("twoFactorUnavailable"));
    expect(loginErrorMessage(t, 429, true)).toBe(t("rateLimited"));
  });
  it("has a distinct message in all six languages for a throttled request", () => {
    for (const locale of locales) {
      const loc = createTranslator(locale, "Login");
      expect(loc("rateLimited")).not.toBe(loc("invalid"));
      expect(loc("serverError")).not.toBe(loc("invalid"));
    }
  });
});

describe("registration errors", () => {
  const t = createTranslator("en", "Register");
  it("tells a 409 to sign in and never claims no account was created after a server failure", () => {
    expect(registerErrorMessage(t, 409)).toBe(t("alreadyRegistered"));
    expect(registerErrorMessage(t, 429)).toBe(t("rateLimited"));
    expect(registerErrorMessage(t, 400)).toBe(t("invalid"));
    for (const status of [500, 502, 503]) {
      expect(registerErrorMessage(t, status)).toBe(t("incomplete"));
      expect(registerErrorMessage(t, status).toLowerCase()).not.toContain("no account was created");
    }
    for (const locale of locales) {
      const loc = createTranslator(locale, "Register");
      expect(loc("incomplete")).not.toBe(loc("unavailable"));
    }
  });
});

describe("one-time code and recovery messages", () => {
  const otp = createTranslator("en", "Otp");
  it("separates wrong, expired and locked codes, and throttled resends", () => {
    expect(verifyErrorMessage(otp, 401)).toBe(otp("wrong"));
    expect(verifyErrorMessage(otp, 410)).toBe(otp("expired"));
    expect(verifyErrorMessage(otp, 429)).toBe(otp("locked"));
    expect(verifyErrorMessage(otp, 502)).toBe(otp("failed"));
    expect(resendErrorMessage(otp, 429)).toBe(otp("resendLimited"));
    expect(resendErrorMessage(otp, 503)).toBe(otp("resendUnavailable"));
    expect(resendErrorMessage(otp, 502)).toBe(otp("resendFailed"));
  });
  it("tells a throttled recovery request and an expired reset code apart from a generic failure", () => {
    const forgot = createTranslator("en", "ForgotPassword");
    const reset = createTranslator("en", "PasswordReset");
    expect(forgotErrorMessage(forgot, 429)).toBe(forgot("limited"));
    expect(forgotErrorMessage(forgot, 502)).toBe(forgot("failed"));
    expect(resetErrorMessage(reset, 401)).toBe(reset("invalidToken"));
    expect(resetErrorMessage(reset, 500)).toBe(reset("failed"));
  });
});

describe("auth screens come from the message files in every language", () => {
  const slides = [
    { title: "A", body: "B", ...SERVICE_ICONS.consult },
    { title: "C", body: "D", ...SERVICE_ICONS.lab },
  ];
  it.each(locales)("renders %s without a missing key and without the English literals", (locale) => {
    const html = inLocale(locale, () => [
      renderToStaticMarkup(<LoginForm locale={locale} />),
      renderToStaticMarkup(<RegisterForm locale={locale} />),
      renderToStaticMarkup(<OtpScreen locale={locale} identifier="patient@example.com" />),
      renderToStaticMarkup(<ForgotPasswordForm locale={locale} />),
      renderToStaticMarkup(<PasswordResetForm locale={locale} />),
      renderToStaticMarkup(<AuthWelcome locale={locale} />),
      renderToStaticMarkup(<OnboardingCarousel slides={slides} locale={locale} />),
      renderToStaticMarkup(<OnboardingPermissionsClient locale={locale} />),
      renderToStaticMarkup(<ThemeToggle label="x" />),
    ].join("\n"));
    expect(html.length).toBeGreaterThan(1000);
    if (locale !== "en") expect(html).not.toMatch(LATIN_ONLY_WORDS);
  });

  it("shows the sign-in labels in the page language (ur, hi, bn, fil are not left in English)", () => {
    for (const locale of ["ur", "hi", "bn", "fil"] as const) {
      const html = inLocale(locale, () => renderToStaticMarkup(<LoginForm locale={locale} />));
      const loc = createTranslator(locale, "Login");
      expect(html).toContain(loc("forgotPassword"));
      expect(html).toContain(loc("showPassword"));
      expect(html).toContain(loc("noAccount"));
      expect(html).toContain(loc("createAccount"));
    }
  });
});

describe("sign-in form details", () => {
  it("says so when a guest start failed (/login?guest=blocked)", () => {
    const html = renderToStaticMarkup(<LoginForm locale="en" guestBlocked />);
    expect(html).toContain(createTranslator("en", "Login")("guestBlocked").replace(/'/g, "&#x27;"));
    expect(html).toContain('role="alert"');
    expect(renderToStaticMarkup(<LoginForm locale="en" />)).not.toContain('role="alert"');
  });

  it("uses a plain text identifier field: no e-mail keyboard (a phone number must be typeable) and no fixed example address", () => {
    const html = renderToStaticMarkup(<LoginForm locale="en" />);
    const field = html.match(/<input[^>]*autoComplete="username"[^>]*>/)?.[0] ?? "";
    expect(field).toBeTruthy();
    expect(field).not.toContain("inputMode");
    expect(field).not.toContain("placeholder");
  });

  it("links the legal sentence to the terms and privacy pages of the page language", () => {
    const html = renderToStaticMarkup(<LoginForm locale="en" />);
    expect(html).toContain('href="/en/terms"');
    expect(html).toContain('href="/en/privacy"');
  });

  it("names the identifier in the code screen from the prop (never the URL), isolated for bidi", () => {
    const html = renderToStaticMarkup(<OtpScreen locale="en" identifier="patient@example.com" />);
    expect(html).toContain("<bdi dir=\"ltr\">patient@example.com</bdi>");
    const without = renderToStaticMarkup(<OtpScreen locale="en" />);
    expect(without).toContain(createTranslator("en", "Otp")("missing"));
  });

  it("types the reset token in a plain text field (it is a long mixed-case string, not digits)", () => {
    const html = renderToStaticMarkup(<PasswordResetForm locale="en" />);
    const field = html.match(/<input[^>]*autoCapitalize="none"[^>]*>/)?.[0] ?? "";
    expect(field).toBeTruthy();
    expect(field).not.toContain("inputMode=\"numeric\"");
  });

  it("offers the reset page right after a recovery request (script-free markup keeps the link out until success)", () => {
    expect(renderToStaticMarkup(<ForgotPasswordForm locale="en" />)).not.toContain("/en/password-reset");
  });

  it("names the three theme buttons in the page language", () => {
    const html = inLocale("ur", () => renderToStaticMarkup(<ThemeToggle label="x" />));
    const loc = createTranslator("ur", "NotificationSettings");
    for (const key of ["appearanceLight", "appearanceAuto", "appearanceDark"]) expect(html).toContain(loc(key));
    expect(html).not.toMatch(/>(light|system|dark)</);
  });
});
